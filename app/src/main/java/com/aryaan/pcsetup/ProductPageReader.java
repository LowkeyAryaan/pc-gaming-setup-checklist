package com.aryaan.pcsetup;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.text.Html;
import android.util.Base64;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.InetAddress;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** A bounded, best-effort, opt-in product metadata reader.
 *  It intentionally does not execute seller JavaScript, bypass anti-bot systems,
 *  forward cookies/credentials, or use paid third-party infrastructure.
 */
final class ProductPageReader {
    private static final int HTML_LIMIT = 750_000;
    private static final int IMAGE_LIMIT = 4_000_000;
    private static final int TIMEOUT_MS = 6500;
    private static final Pattern META_TAG =
        Pattern.compile("<meta\\b[^>]*>",Pattern.CASE_INSENSITIVE|Pattern.DOTALL);
    private static final Pattern ATTR =
        Pattern.compile("([a-zA-Z0-9_:-]+)\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))");
    private static final Pattern IMG_TAG =
        Pattern.compile("<img\\b[^>]*>",Pattern.CASE_INSENSITIVE|Pattern.DOTALL);
    private static final Pattern SCRIPT =
        Pattern.compile("<script\\b([^>]*)>(.*?)</script\\s*>",Pattern.CASE_INSENSITIVE|Pattern.DOTALL);

    private ProductPageReader() {}

    static JSONObject read(String input) { return read(input,true); }
    // Launch checks fetch only HTML price metadata. Never download 4MB images
    // for every tracked product on every app opening.
    static JSONObject readPrice(String input) { return read(input,false); }
    private static JSONObject read(String input, boolean includeImage) {
        JSONObject result=new JSONObject();
        try {
            URL requested=secureUrl(input);
            byte[] bytes=download(requested,HTML_LIMIT,"text/html");
            String html=new String(bytes,StandardCharsets.UTF_8);
            URL current=requested;
            JSONObject product=findStructuredProduct(html);
            JSONObject offers=product!=null?asObject(product.opt("offers")):null;
            if(offers==null&&product!=null){
                JSONArray multiple=product.optJSONArray("offers");
                if(multiple!=null&&multiple.length()>0) offers=multiple.optJSONObject(0);
            }
            String title=first(nonempty(product!=null?product.optString("name"):null),
                meta(html,"og:title"),meta(html,"twitter:title"),htmlTitle(html));
            // Prefer Product/Offer schema and explicit price fields. If the
            // store only renders WooCommerce markup, consider the visible
            // single-product price, never a sidebar or "price history" number.
            String price=first(
                offers!=null?value(offers.opt("price")):null,
                offers!=null?value(offers.opt("lowPrice")):null,
                offers!=null?priceSpecification(offers.opt("priceSpecification")):null,
                product!=null?value(product.opt("price")):null,
                meta(html,"product:price:amount"),meta(html,"og:price:amount"),
                meta(html,"price"),meta(html,"product:price"),
                meta(html,"sale_price"),productPagePrice(html));
            // Ranges must be resolved BEFORE scalar prices, because
            // AggregateOffer.lowPrice and WooCommerce range markup routinely
            // expose the cheapest variant instead of the selected variant.
            double[] range=publishedPriceRange(html,product,offers,price);
            String currency=first(
                offers!=null?nonempty(offers.optString("priceCurrency")):null,
                product!=null?nonempty(product.optString("priceCurrency")):null,
                meta(html,"product:price:currency"),meta(html,"og:price:currency"),
                meta(html,"priceCurrency"),meta(html,"currency"),publishedCurrency(html));
            java.util.LinkedHashSet<String> candidates=includeImage?
                imageCandidates(html,product,title):new java.util.LinkedHashSet<>();
            String image=candidates.isEmpty()?null:candidates.iterator().next();
            if(title==null&&price==null&&range==null&&image==null){
                return result.put("ok",false).put("message",
                    "This store did not expose product details. Enter them manually.");
            }
            result.put("ok",true);
            if(title!=null)result.put("name",tidy(title,180));
            if(range!=null){
                // An ambiguous product page is not an exact SKU quotation.
                result.put("price",JSONObject.NULL);
                result.put("priceKind",Double.isFinite(range[1])?"range":"starting-at");
                result.put("lowPrice",range[0]);
                if(Double.isFinite(range[1]))result.put("highPrice",range[1]);
                result.put("priceMessage",Double.isFinite(range[1])?
                    "This store lists different prices for product variants. Confirm your selected variant price.":
                    "The store only publishes a starting price. Confirm your selected variant price.");
            }else if(price!=null){
                Double number=parseMoney(price);
                if(number!=null)result.put("price",number);
                else result.put("price",JSONObject.NULL);
                result.put("priceKind","exact");
            }else result.put("price",JSONObject.NULL);
            if(currency!=null)result.put("currency",currency.trim().toUpperCase(Locale.US));
            // Let the UI distinguish an actual missing price, an unverified
            // currency, and a retailer that blocked the HTTP request.
            if(range==null){
                if(price==null||result.isNull("price"))result.put("priceMessage",
                    "No current product price was exposed by this store.");
                else if(currency==null)result.put("priceMessage",
                    "The listing has a price but does not identify its currency.");
            }
            if(includeImage&&image!=null){
                int attempts=0;
                boolean ready=false;
                for(String candidate:candidates){
                    if(attempts++>=8)break;
                    try {
                        URL imageUrl=secureUrl(new URL(current,decodeHtml(candidate)).toString());
                        String inline=downloadImage(imageUrl,current);
                        if(inline!=null){result.put("imageData",inline);ready=true;break;}
                    }catch(Exception ignored){ /* Try another public gallery image. */ }
                }
                if(!ready)result.put("imageMessage",
                    "Product image was listed by this store but could not be downloaded. Choose a photo manually.");
            }else if(includeImage)result.put("imageMessage",
                "No public product photo was found. Choose a photo manually.");
            return result;
        }catch(Exception error) {
            try {
                result.put("ok",false);
                result.put("message","Could not access this product page. Enter details manually.");
                result.put("errorCode","fetch-blocked");
            }catch(JSONException ignored){}
            return result;
        }
    }

    private static byte[] download(URL initial,int limit,String expectedType) throws Exception {
        return download(initial,limit,expectedType,null);
    }
    private static byte[] download(URL initial,int limit,String expectedType,URL referrer) throws Exception {
        URL url=initial;
        for(int hop=0;hop<4;hop++){
            secureUrl(url.toString());
            HttpURLConnection connection=(HttpURLConnection)url.openConnection();
            connection.setConnectTimeout(TIMEOUT_MS);
            connection.setReadTimeout(TIMEOUT_MS);
            connection.setInstanceFollowRedirects(false);
            if(referrer!=null&&expectedType.equals("image/"))
                connection.setRequestProperty("Referer",referrer.getProtocol()+"://"+referrer.getHost()+"/");
            connection.setRequestProperty("Accept",expectedType.equals("text/html")?
                "text/html,application/xhtml+xml":"image/jpeg,image/png,image/webp");
            connection.setRequestProperty("User-Agent",
                "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36");
            try {
                int status=connection.getResponseCode();
                if(status>=300&&status<400){
                    String location=connection.getHeaderField("Location");
                    if(location==null)throw new Exception("Redirect without destination");
                    url=secureUrl(new URL(url,location).toString());
                    continue;
                }
                if(status!=200)throw new Exception("HTTP "+status);
                String mime=connection.getContentType();
                if(mime==null||!mime.toLowerCase(Locale.US).contains(expectedType.equals("text/html")?
                    "html":"image/"))throw new Exception("Unsupported response type");
                int declared=connection.getContentLength();
                if(declared>limit)throw new Exception("Resource too large");
                try(InputStream stream=connection.getInputStream();
                    ByteArrayOutputStream output=new ByteArrayOutputStream()){
                    byte[] buffer=new byte[8192];
                    int n;
                    while((n=stream.read(buffer))!=-1){
                        if(output.size()+n>limit)throw new Exception("Size limit exceeded");
                        output.write(buffer,0,n);
                    }
                    return output.toByteArray();
                }
            }finally{connection.disconnect();}
        }
        throw new Exception("Too many redirects");
    }
    private static URL secureUrl(String raw) throws Exception {
        if(raw==null||raw.length()>2048)throw new Exception("Invalid URL");
        URL url=new URL(raw);
        if(!"https".equalsIgnoreCase(url.getProtocol())||url.toURI().getUserInfo()!=null)
            throw new Exception("Only secure public links allowed");
        String host=url.getHost().toLowerCase(Locale.US);
        if(!host.matches("[a-z0-9.-]+")||host.equals("localhost")||
            host.endsWith(".localhost")||host.endsWith(".local")||host.endsWith(".internal")||
            host.matches("\\d+(?:\\.\\d+){3}"))throw new Exception("Private host blocked");
        if(url.getPort()!=-1&&url.getPort()!=443)throw new Exception("Restricted port");
        for(InetAddress address:InetAddress.getAllByName(host)){
            if(address.isAnyLocalAddress()||address.isLoopbackAddress()||
                address.isSiteLocalAddress()||address.isLinkLocalAddress()||
                address.isMulticastAddress())throw new Exception("Private address blocked");
        }
        return url;
    }
    private static String meta(String html,String wanted) {
        Matcher tags=META_TAG.matcher(html);
        while(tags.find()){
            Matcher m=ATTR.matcher(tags.group());
            String key=null,content=null;
            while(m.find()){
                String attribute=m.group(1).toLowerCase(Locale.US);
                String v=first(m.group(2),m.group(3),m.group(4));
                if(attribute.equals("property")||attribute.equals("name")||attribute.equals("itemprop"))key=v;
                if(attribute.equals("content"))content=v;
            }
            if(wanted.equalsIgnoreCase(key)&&nonempty(content)!=null)return content;
        }
        return null;
    }
    private static String decodeHtml(String input){
        if(input==null)return "";
        return Html.fromHtml(input.replace("&amp;","&")).toString().trim();
    }
    private static java.util.LinkedHashSet<String> imageCandidates(String html,JSONObject product,String title){
        java.util.LinkedHashSet<String> links=new java.util.LinkedHashSet<>();
        if(product!=null){
            Object images=product.opt("image");
            if(images instanceof JSONArray){
                JSONArray array=(JSONArray)images;
                for(int i=0;i<Math.min(array.length(),8);i++){
                    Object candidate=array.opt(i);
                    if(candidate instanceof JSONObject){
                        JSONObject detail=(JSONObject)candidate;
                        appendImage(links,first(nonempty(detail.optString("url")),
                            nonempty(detail.optString("contentUrl"))));
                    } else if(candidate instanceof String)appendImage(links,(String)candidate);
                }
            }else appendImage(links,imageFromProduct(product));
        }
        for(String key:new String[]{"og:image:secure_url","og:image:url","og:image",
            "twitter:image:src","twitter:image","product:image","image","thumbnail"})
            appendImage(links,meta(html,key));
        Matcher tags=IMG_TAG.matcher(html);
        int scanned=0;
        String word="";
        if(title!=null){
            for(String token:title.toLowerCase(Locale.US).split("[^a-z0-9]+")){
                if(token.length()>5){word=token;break;}
            }
        }
        while(tags.find()&&scanned++<120){
            Matcher attrs=ATTR.matcher(tags.group());
            java.util.HashMap<String,String> values=new java.util.HashMap<>();
            while(attrs.find()){
                String value=first(attrs.group(2),attrs.group(3),attrs.group(4));
                if(value!=null)values.put(attrs.group(1).toLowerCase(Locale.US),value);
            }
            String context=(String.valueOf(values.get("class"))+" "+
                String.valueOf(values.get("alt"))+" "+String.valueOf(values.get("id"))).toLowerCase(Locale.US);
            boolean productLike=context.contains("product")||context.contains("gallery")||
                context.contains("featured")||context.contains("woocommerce")||
                context.contains("zoom")||context.contains("main-image")||
                (!word.isEmpty()&&context.contains(word));
            boolean icon=context.contains("logo")||context.contains("icon")||
                context.contains("avatar")||context.contains("social")||context.contains("payment");
            if(!productLike||icon)continue;
            for(String key:new String[]{"data-large_image","data-zoom-image","data-original",
                "data-src","data-lazy-src","src"})appendImage(links,values.get(key));
            String srcset=first(values.get("data-srcset"),values.get("srcset"));
            if(srcset!=null){
                String[] segments=srcset.split(",");
                if(segments.length>0){
                    String[] tokens=segments[segments.length-1].trim().split("\\s+");
                    if(tokens.length>0)appendImage(links,tokens[0]);
                }
            }
        }
        return links;
    }
    private static void appendImage(java.util.LinkedHashSet<String> links,String url){
        if(url==null)return;
        String cleaned=decodeHtml(url).trim();
        if(cleaned.isEmpty()||cleaned.length()>2048||cleaned.startsWith("data:")||
            cleaned.startsWith("blob:")||cleaned.startsWith("javascript:"))return;
        links.add(cleaned);
    }
    /** An ambiguous price needs a variant choice; never silently use lowPrice.
     *  [min,max] means range; [min,NaN] means 'from' / starting at.
     *  This is metadata only. It must not execute store JS or guess variants. */
    private static double[] publishedPriceRange(String html,JSONObject product,
                                                JSONObject offer,String scalar){
        Double rawLow=offer==null?null:parseMoney(value(offer.opt("lowPrice")));
        Double rawHigh=offer==null?null:parseMoney(value(offer.opt("highPrice")));
        if(rawLow==null&&product!=null)
            rawLow=parseMoney(value(product.opt("lowPrice")));
        if(rawHigh==null&&product!=null)
            rawHigh=parseMoney(value(product.opt("highPrice")));
        double[] pair=rangeFromValues(rawLow,rawHigh);
        if(pair!=null)return pair;
        if(product!=null){
            JSONArray offers=product.optJSONArray("offers");
            if(offers!=null&&offers.length()>1){
                Double min=null,max=null;
                for(int i=0;i<Math.min(50,offers.length());i++){
                    JSONObject o=offers.optJSONObject(i);
                    if(o==null)continue;
                    Double amount=parseMoney(first(value(o.opt("price")),
                        priceSpecification(o.opt("priceSpecification"))));
                    if(amount==null||amount<=0)continue;
                    min=min==null?amount:Math.min(min,amount);
                    max=max==null?amount:Math.max(max,amount);
                }
                pair=rangeFromValues(min,max);
                if(pair!=null)return pair;
            }
        }
        // A numeric range in a price meta field must not pass parseMoney().
        pair=amountRange(scalar);
        if(pair!=null)return pair;
        // WooCommerce may expose lowPrice metadata while rendering a complete
        // range in the visible product header. Prefer the richer range.
        pair=productPageRange(html);
        if(pair!=null)return pair;
        if(rawLow!=null&&rawLow>0)return new double[]{rawLow,Double.NaN};
        return null;
    }

    private static double[] rangeFromValues(Double min,Double max){
        if(min!=null&&max!=null&&min>0&&max>min+0.005)return new double[]{min,max};

        return null;
    }

    /** Only parse pairs explicitly joined by a range separator. A discount's
     *  old/deleted price is not a variant range. */
    private static double[] amountRange(String source){
        if(source==null)return null;
        String plain=decodeHtml(source.replaceAll("(?is)<del\\b[^>]*>.*?</del\\s*>",""));
        String amount="(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d{2,10}(?:\\.\\d{1,2})?)";
        Matcher m=Pattern.compile(amount+
            "\\s*(?:[-–—−]|\\bto\\b)\\s*(?:Rs\\.?|PKR|\\$|£|€)?\\s*"+amount,
            Pattern.CASE_INSENSITIVE).matcher(plain);
        if(m.find()){
            Double low=parseMoney(m.group(1)),high=parseMoney(m.group(2));
            if(low!=null&&high!=null&&low>0&&high>low+0.005)
                return new double[]{low,high};
        }
        return null;
    }

    private static double[] productPageRange(String html){
        Pattern priceBlock=Pattern.compile(
            "<p\\b(?=[^>]*\\bclass\\s*=\\s*['\"][^'\"]*\\bprice\\b[^'\"]*['\"])[^>]*>(.*?)</p\\s*>",
            Pattern.CASE_INSENSITIVE|Pattern.DOTALL);
        Matcher blocks=priceBlock.matcher(html);
        while(blocks.find()){
            String raw=blocks.group(1);
            int position=blocks.start(),from=Math.max(0,position-5500);
            String prefix=html.substring(from,position).toLowerCase(Locale.US);
            if(prefix.contains("related products")||prefix.contains("you may also like"))
                continue;
            double[] pair=amountRange(raw.replaceAll("(?is)<[^>]+>"," "));
            if(pair!=null)return pair;
        }
        return null;
    }

    /** Explicit ISO currency metadata only. Do not infer from .pk host or
     * a generic rupee symbol, which may represent several currencies. */
    private static String publishedCurrency(String html){
        for(String key:new String[]{"woocommerce_currency","currencyCode","currency_code",
            "priceCurrency","store_currency","currency"}){
            Pattern field=Pattern.compile(
                "[\"']"+Pattern.quote(key)+"[\"']\\s*[:=]\\s*[\"']([A-Za-z]{3})[\"']",
                Pattern.CASE_INSENSITIVE);
            Matcher match=field.matcher(html);
            if(match.find())return match.group(1);
        }
        // WooCommerce often renders a hidden itemprop="priceCurrency" field
        // outside a meta tag (e.g. <span itemprop="priceCurrency"...>PKR</span>).
        Matcher itemprop=Pattern.compile(
            "<(?:span|div|input)\\b[^>]*\\bitemprop\\s*=\\s*['\"]priceCurrency['\"][^>]*>",
            Pattern.CASE_INSENSITIVE).matcher(html);
        if(itemprop.find()){
            Matcher attr=ATTR.matcher(itemprop.group());
            while(attr.find()){
                if("content".equalsIgnoreCase(attr.group(1))||
                   "value".equalsIgnoreCase(attr.group(1)))
                    return first(attr.group(2),attr.group(3),attr.group(4));
            }
        }
        return null;
    }

    /** Last-resort targeted price from the main product summary only.
     * Do not scan the full page for any amount: shipping, recommendations,
     * old prices and price history would be unsafe substitutions. */
    private static String productPagePrice(String html){
        // WooCommerce single-product price paragraph. Prefer <ins> for sale
        // prices; <del> is deliberately ignored to avoid former pricing.
        Pattern priceBlock=Pattern.compile(
            "<p\\b(?=[^>]*\\bclass\\s*=\\s*['\"][^'\"]*\\bprice\\b[^'\"]*['\"])[^>]*>(.*?)</p\\s*>",
            Pattern.CASE_INSENSITIVE|Pattern.DOTALL);
        Matcher blocks=priceBlock.matcher(html);
        while(blocks.find()){
            String raw=blocks.group(1);
            // Only accept a main product summary region, not related products.
            int position=blocks.start();
            int from=Math.max(0,position-5500);
            String prefix=html.substring(from,position).toLowerCase(Locale.US);
            if(prefix.contains("related products")||prefix.contains("you may also like"))
                continue;
            Matcher sale=Pattern.compile("<ins\\b[^>]*>(.*?)</ins\\s*>",
                Pattern.CASE_INSENSITIVE|Pattern.DOTALL).matcher(raw);
            String active=sale.find()?sale.group(1):raw.replaceAll(
                "(?is)<del\\b[^>]*>.*?</del\\s*>","");
            Matcher amount=Pattern.compile(
                "<(?:bdi|span)\\b[^>]*>([^<>]*[0-9][^<>]*)</(?:bdi|span)\\s*>",
                Pattern.CASE_INSENSITIVE|Pattern.DOTALL).matcher(active);
            while(amount.find()){
                String text=decodeHtml(amount.group(1));
                Double amountValue=parseMoney(text);
                if(amountValue!=null&&amountValue>0)return text;
            }
            // Some shops put a number directly beside the currency symbol.
            String text=decodeHtml(active.replaceAll("(?is)<[^>]+>"," "));
            Matcher number=Pattern.compile("(?<!\\d)(\\d{1,3}(?:,\\d{3})+(?:\\.\\d{1,2})?|\\d{2,10}(?:\\.\\d{1,2})?)(?!\\d)")
                .matcher(text);
            if(number.find())return number.group(1);
        }
        // Supported explicit product itemprop="price" markup.
        Matcher priceAttr=Pattern.compile(
            "<(?:span|div|input)\\b[^>]*\\bitemprop\\s*=\\s*['\"]price['\"][^>]*>",
            Pattern.CASE_INSENSITIVE).matcher(html);
        if(priceAttr.find()){
            Matcher attr=ATTR.matcher(priceAttr.group());
            while(attr.find()){
                if("content".equalsIgnoreCase(attr.group(1))||
                   "value".equalsIgnoreCase(attr.group(1)))
                    return first(attr.group(2),attr.group(3),attr.group(4));
            }
        }
        return null;
    }

    private static JSONObject findStructuredProduct(String html){
        Matcher scripts=SCRIPT.matcher(html);
        while(scripts.find()){
            if(!scripts.group(1).toLowerCase(Locale.US).contains("ld+json"))continue;
            String content=scripts.group(2).trim();
            try {
                Object json=content.startsWith("[")?new JSONArray(content):new JSONObject(content);
                JSONObject product=searchProduct(json,0);
                if(product!=null)return product;
            }catch(Exception ignored){}
        }
        return null;
    }
    private static JSONObject searchProduct(Object node,int depth){
        if(node==null||depth>5)return null;
        if(node instanceof JSONArray){
            JSONArray list=(JSONArray)node;
            for(int i=0;i<Math.min(40,list.length());i++){
                JSONObject product=searchProduct(list.opt(i),depth+1);
                if(product!=null)return product;
            }
        }else if(node instanceof JSONObject){
            JSONObject json=(JSONObject)node;
            Object type=json.opt("@type");
            String t=type==null?"":String.valueOf(type).toLowerCase(Locale.US);
            if(t.contains("product"))return json;
            for(String key:new String[]{"@graph","mainEntity","itemListElement"}){
                JSONObject product=searchProduct(json.opt(key),depth+1);
                if(product!=null)return product;
            }
        }
        return null;
    }
    private static JSONObject asObject(Object obj){return obj instanceof JSONObject?(JSONObject)obj:null;}
    private static String imageFromProduct(JSONObject product){
        if(product==null)return null;
        Object image=product.opt("image");
        if(image instanceof String)return nonempty((String)image);
        if(image instanceof JSONArray){
            JSONArray arr=(JSONArray)image;
            if(arr.length()>0)image=arr.opt(0);
        }
        if(image instanceof JSONObject)return first(
            nonempty(((JSONObject)image).optString("url")),
            nonempty(((JSONObject)image).optString("contentUrl")));
        return image instanceof String?nonempty((String)image):null;
    }
    private static String priceSpecification(Object spec){
        JSONObject obj=asObject(spec);
        if(obj!=null)return first(value(obj.opt("price")),value(obj.opt("minPrice")));
        if(spec instanceof JSONArray){
            JSONArray array=(JSONArray)spec;
            for(int i=0;i<Math.min(8,array.length());i++){
                String price=priceSpecification(array.opt(i));
                if(price!=null)return price;
            }
        }
        return null;
    }
    private static String value(Object v){return v==null||v==JSONObject.NULL?null:nonempty(String.valueOf(v));}
    private static String htmlTitle(String html){
        Matcher matcher=Pattern.compile("<title[^>]*>(.*?)</title>",
            Pattern.CASE_INSENSITIVE|Pattern.DOTALL).matcher(html);
        return matcher.find()?matcher.group(1):null;
    }
    private static String nonempty(String value){
        return value==null||value.trim().length()==0?null:value.trim();
    }
    private static String first(String...args){
        for(String s:args)if(nonempty(s)!=null)return s;
        return null;
    }
    private static String tidy(String input,int limit){
        String text=Html.fromHtml(input).toString().replaceAll("\\s+"," ").trim();
        return text.length()>limit?text.substring(0,limit):text;
    }
    private static Double parseMoney(String raw){
        if(raw==null)return null;
        String s=raw.replaceAll("[^0-9,.]","");
        if(s.length()==0||s.length()>20)return null;
        int dot=s.lastIndexOf('.'),comma=s.lastIndexOf(',');
        if(dot>=0&&comma>=0){
            int decimal=Math.max(dot,comma);
            s=s.substring(0,decimal).replaceAll("[,.]","")+"."+s.substring(decimal+1).replaceAll("[,.]","");
        }else if(comma>=0){
            int last=s.length()-comma-1;
            if(last>0&&last<=2)s=s.replaceAll(",","").replaceFirst("(\\d+)(\\d{"+last+"})$","$1.$2");
            else s=s.replace(",","");
        }else if(dot>=0&&s.length()-dot-1==3)s=s.replace(".","");
        try{
            double number=Double.parseDouble(s);
            return Double.isFinite(number)&&number>=0&&number<=100_000_000_000.0?number:null;
        }catch(Exception e){return null;}
    }
    private static String downloadImage(URL url,URL productUrl){
        try {
            byte[] encoded=download(url,IMAGE_LIMIT,"image/",productUrl);
            BitmapFactory.Options bounds=new BitmapFactory.Options();
            bounds.inJustDecodeBounds=true;
            BitmapFactory.decodeByteArray(encoded,0,encoded.length,bounds);
            if(bounds.outWidth<=0||bounds.outHeight<=0||bounds.outWidth>9000||bounds.outHeight>9000)return null;
            BitmapFactory.Options options=new BitmapFactory.Options();
            int largest=Math.max(bounds.outWidth,bounds.outHeight);
            options.inSampleSize=Math.max(1,(int)Math.ceil(largest/720.0));
            Bitmap bmp=BitmapFactory.decodeByteArray(encoded,0,encoded.length,options);
            if(bmp==null)return null;
            ByteArrayOutputStream output=new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.JPEG,76,output);
            bmp.recycle();
            if(output.size()>500_000)return null;
            return "data:image/jpeg;base64,"+Base64.encodeToString(output.toByteArray(),Base64.NO_WRAP);
        }catch(Exception ignored){return null;}
    }
}
