package al.udhembare.auto;
import android.content.Context;
import org.json.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;

final class RegistryClient {
 static final String BASE="https://tosilabs.github.io/ev-balkan-web/data/";
 private final File directory;
 record Snapshot(JSONArray elements,String fetchedAt,boolean cached){}
 RegistryClient(Context context){directory=new File(context.getCacheDir(),"public-registry-v1");directory.mkdirs();}
 interface Validation {void check(JSONObject data);}
 Snapshot load(double[] box)throws Exception{
  AtomicBoolean stale=new AtomicBoolean(false);AtomicLong bytes=new AtomicLong();
  JSONObject index=read("registry-index.json",RegistryParser::validateIndex,stale,bytes,600000);
  JSONArray b=index.getJSONArray("bounds");if(box[0]<b.getDouble(0)||box[1]<b.getDouble(1)||box[2]>b.getDouble(2)||box[3]>b.getDouble(3))throw new IOException("Jashtë mbulimit të regjistrit të Ballkanit. Zgjidh një vend tjetër.");
  String built=index.getString("builtAt");List<String> names=new ArrayList<>();JSONObject tiles=index.getJSONObject("tiles");
  for(int lat=(int)Math.floor(box[0]);lat<=Math.floor(box[2]);lat++)for(int lon=(int)Math.floor(box[1]);lon<=Math.floor(box[3]);lon++){String key=lat+"_"+lon;if(tiles.has(key))names.add(key);}
  if(names.size()>64)throw new IOException("Kërkimi mbulon shumë zona. Ngushto itinerarin ose rrezen.");
  ExecutorService pool=Executors.newFixedThreadPool(Math.max(1,Math.min(4,names.size())));List<Future<JSONObject>> tasks=new ArrayList<>();JSONArray elements=new JSONArray();
  try{
   for(String key:names)tasks.add(pool.submit(()->read("tiles/"+key+".json",v->RegistryParser.validateTile(v,built),stale,bytes,86400000,built)));
   for(Future<JSONObject> task:tasks){checkCancelled();JSONArray values=task.get().getJSONArray("elements");for(int i=0;i<values.length();i++)elements.put(values.get(i));}
  }catch(ExecutionException e){Throwable cause=e.getCause();if(cause instanceof Exception x)throw x;throw new IOException("Regjistri nuk u ngarkua.");}
  finally{for(Future<?> task:tasks)task.cancel(true);pool.shutdownNow();}
  trim();return new Snapshot(elements,index.getString("fetchedAt"),stale.get());
 }
 private JSONObject read(String path,Validation validation,AtomicBoolean stale,AtomicLong budget,long ttl)throws Exception{return read(path,validation,stale,budget,ttl,"");}
 private JSONObject read(String path,Validation validation,AtomicBoolean stale,AtomicLong budget,long ttl,String generation)throws Exception{
  checkCancelled();File cache=new File(directory,digest(path+generation)+".json");
  JSONObject saved=null;try{if(cache.length()<=8_000_000&&cache.isFile()){saved=new JSONObject(new String(java.nio.file.Files.readAllBytes(cache.toPath()),StandardCharsets.UTF_8));validation.check(saved);}}catch(Exception e){saved=null;}
  if(saved!=null&&System.currentTimeMillis()-cache.lastModified()<ttl)return saved;
  try{
   JSONObject next=new JSONObject(http(BASE+path,budget));validation.check(next);
   try{File temp=File.createTempFile("registry-",".tmp",directory);try{java.nio.file.Files.write(temp.toPath(),next.toString().getBytes(StandardCharsets.UTF_8));if(!temp.renameTo(cache))temp.delete();}finally{temp.delete();}}catch(IOException ignored){}
   return next;
  }catch(Exception e){checkCancelled();if(saved==null)throw e;stale.set(true);return saved;}
 }
 static String http(String address,AtomicLong budget)throws IOException{
  checkCancelled();HttpURLConnection c=(HttpURLConnection)new URL(address).openConnection();c.setConnectTimeout(8000);c.setReadTimeout(12000);c.setInstanceFollowRedirects(false);c.setRequestProperty("User-Agent","UdhembareAndroid/0.1 (public charging registry)");
  try{if(c.getResponseCode()!=200)throw new IOException("Shërbimi nuk u përgjigj. Kontrollo internetin dhe provo përsëri.");
   try(InputStream in=c.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream()){byte[] buffer=new byte[8192];int n;while((n=in.read(buffer))!=-1){checkCancelled();if(out.size()+n>8_000_000||budget.addAndGet(n)>48_000_000)throw new IOException("Përgjigjja është shumë e madhe. Ngushto kërkimin.");out.write(buffer,0,n);}return out.toString(StandardCharsets.UTF_8.name());}
  }finally{c.disconnect();}
 }
 static void checkCancelled()throws InterruptedIOException{if(Thread.currentThread().isInterrupted())throw new InterruptedIOException("Kërkimi u anulua.");}
 private static String digest(String text)throws Exception{StringBuilder out=new StringBuilder();for(byte b:MessageDigest.getInstance("SHA-256").digest(text.getBytes(StandardCharsets.UTF_8)))out.append(String.format(Locale.ROOT,"%02x",b&255));return out.toString();}
 private void trim(){File[] files=directory.listFiles();if(files==null)return;Arrays.sort(files,Comparator.comparingLong(File::lastModified));long size=0;for(File f:files)size+=f.length();for(File f:files)if(size>64_000_000){long n=f.length();if(f.delete())size-=n;}}
}
