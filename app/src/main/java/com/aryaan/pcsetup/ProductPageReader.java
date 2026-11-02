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

    static JSONObject read(String input) {
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
            String price=first(
                offers!=null?value(offers.opt("price")):null,
                offers!=null?value(offers.opt("lowPrice")):null,
                offers!=null?priceSpecification(offers.opt("priceSpecification")):null,
                meta(html,"product:price:amount"),meta(html,"og:price:amount"),
                meta(html,"price"),meta(html,"product:price"));
            String currency=first(
                offers!=null?nonempty(offers.optString("priceCurrency")):null,
                meta(html,"product:price:currency"),meta(html,"og:price:currency"));
            java.util.LinkedHashSet<String> candidates=imageCandidates(html,product,title);
            String image=candidates.isEmpty()?null:candidates.iterator().next();
            if(title==null&&price==null&&image==null){
                return result.put("ok",false).put("message",
                    "This store did not expose product details. Enter them manually.");
            }
            result.put("ok",true);
            if(title!=null)result.put("name",tidy(title,180));
            if(price!=null){
                Double number=parseMoney(price);
                if(number!=null)result.put("price",number);
                else result.put("price",JSONObject.NULL);
            }else result.put("price",JSONObject.NULL);
            if(currency!=null)result.put("currency",currency.toUpperCase(Locale.US));
            if(image!=null){
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
            }else result.put("imageMessage",
                "No public product photo was found. Choose a photo manually.");
            return result;
        }catch(Exception error) {
            try {
                result.put("ok",false);
                result.put("message","Could not access this product page. Enter details manually.");
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
        return obj==null?null:value(obj.opt("price"));
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
