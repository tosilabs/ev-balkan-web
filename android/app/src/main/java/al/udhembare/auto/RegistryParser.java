package al.udhembare.auto;
import org.json.*;
import java.time.Instant;
import java.util.*;

/** Same public regional records as the web app. No credentials or live-status inference. */
public final class RegistryParser {
 private RegistryParser(){}
 public static void validateIndex(JSONObject data){
  JSONArray b=data.optJSONArray("bounds");if(data.optInt("schema")!=1||b==null||b.length()!=4||data.optJSONObject("tiles")==null)throw new IllegalArgumentException("Indeksi i regjistrit nuk është i vlefshëm.");
  for(int i=0;i<4;i++)if(!Double.isFinite(b.optDouble(i)))throw new IllegalArgumentException("Kufij të pavlefshëm.");
  if(b.optDouble(0)>b.optDouble(2)||b.optDouble(1)>b.optDouble(3))throw new IllegalArgumentException("Kufij të pavlefshëm.");
  Instant.parse(data.optString("builtAt"));Instant.parse(data.optString("fetchedAt"));
 }
 public static void validateTile(JSONObject data,String builtAt){if(!builtAt.equals(data.optString("builtAt"))||data.optJSONArray("elements")==null)throw new IllegalArgumentException("Pjesa e regjistrit nuk përputhet. Provo sërish.");}
 public static List<Station> parse(JSONArray records,Geo.Point center,List<Geo.Point> line,SearchOptions options){
  List<Station> out=new ArrayList<>();Set<String> seen=new HashSet<>();
  for(int i=0;i<records.length();i++)try{
   JSONObject e=records.optJSONObject(i);if(e==null)continue;JSONObject t=e.optJSONObject("tags");if(t==null)t=new JSONObject();
   String id=e.optString("type")+"/"+e.optString("id");if(!id.matches("(node|way|relation|ocm|myfah|fines|zagreb|community)/[A-Za-z0-9_.:%*+!-]{1,220}")||!seen.add(id))continue;
   if(Set.of("private","no").contains(t.optString("access"))||t.has("disused:amenity")||t.has("abandoned:amenity")||"closed".equals(t.optString("operational_status")))continue;
   JSONObject p=e.optJSONObject("center");if(p==null)p=e;if(!p.has("lat")||!p.has("lon"))continue;Geo.Point point=new Geo.Point(p.getDouble("lat"),p.getDouble("lon"));
   Geo.Projection projection=line==null?null:Geo.project(point,line);double distance=projection==null?Geo.distance(center,point):projection.offsetKm();if(distance>options.radiusKm())continue;
   Map<String,Double> connections=new LinkedHashMap<>();JSONArray c=e.optJSONArray("connections");
   if(c!=null){for(int j=0;j<c.length();j++){JSONObject v=c.optJSONObject(j);if(v==null)continue;match(connections,v.optString("label"),v.optDouble("power",0),options);}}
   else for(String key:new String[]{"type2_combo","type2"}){String count=t.optString("socket:"+key);if(!count.isBlank()&&!count.equals("0")&&!count.equals("no"))match(connections,key.equals("type2_combo")?"CCS2":"Type 2",power(t.optString("socket:"+key+":output")),options);}
   if(connections.isEmpty())continue;double max=connections.values().stream().mapToDouble(v->v).max().orElse(0);
   String source=switch(e.optString("type")){case "ocm"->"Open Charge Map";case "fines"->"Fines Charging";case "myfah"->"MYFAH";case "zagreb"->"Qyteti i Zagrebit";case "community"->"Komuniteti Udhëmbarë";default->"OpenStreetMap";};
   out.add(new Station(id,clean(t.optString("name",t.optString("operator","Stacion karikimi"))),point,clean((t.optString("addr:street")+" "+t.optString("addr:housenumber")+" "+t.optString("addr:city")).trim()),String.join(" / ",connections.keySet()),max,clean(t.optString("charge")),clean(t.optString("operator",t.optString("brand","I panjohur"))),clean(t.optString("opening_hours")),source,clean(e.optString("sourceUpdatedAt","i panjohur")),distance,projection==null?0:projection.alongKm(),line!=null));
  }catch(JSONException|IllegalArgumentException ignored){/* One malformed station must not hide the others. */}
  out.sort(line==null?Comparator.comparingDouble(Station::distanceKm):Comparator.comparingDouble(Station::progressKm).thenComparingDouble(Station::distanceKm));return List.copyOf(out);
 }
 private static String clean(String s){return s.replaceAll("[\\p{Cntrl}&&[^\\n]]","").substring(0,Math.min(s.replaceAll("[\\p{Cntrl}&&[^\\n]]","").length(),300));}
 private static void match(Map<String,Double> out,String label,double power,SearchOptions o){if(!Set.of("CCS2","Type 2").contains(label))return;if(!Double.isFinite(power)||power<0||power>2000)power=0;if((o.connector().equals("Të dy")||o.connector().equals(label))&&power>=o.minPowerKw())out.merge(label,power,Math::max);}
 static double power(String raw){double max=0;for(String part:raw.split(";"))try{String s=part.trim().replace(',','.');java.util.regex.Matcher m=java.util.regex.Pattern.compile("^([0-9]+(?:\\.[0-9]+)?)\\s*(kW|W)?$",java.util.regex.Pattern.CASE_INSENSITIVE).matcher(s);if(m.matches()){double p=Double.parseDouble(m.group(1));if("W".equalsIgnoreCase(m.group(2)))p/=1000;if(p<=2000)max=Math.max(max,p);}}catch(NumberFormatException ignored){}return max;}
}
