package al.udhembare.auto;
import android.content.*;
import android.location.*;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;

public final class Repository {
 public final SharedPreferences prefs;private final Context context;
 public Repository(Context c){context=c.getApplicationContext();prefs=context.getSharedPreferences("udhembare",0);}
 public record Place(String label,Geo.Point point){}
 public record Result(List<Station> stations,String note){}
 public record Trip(Geo.Point start,Geo.Point end,String label){}
 public SearchOptions options(){try{return new SearchOptions(Double.parseDouble(prefs.getString("radius_km","10")),Double.parseDouble(prefs.getString("min_power_kw","0")),prefs.getString("connector","Të dy"));}catch(IllegalArgumentException e){return SearchOptions.defaults();}}
 public NavigationTarget navigation(){return NavigationTarget.from(prefs.getString("navigation","WAZE"));}
 public void saveOptions(SearchOptions o,NavigationTarget n){prefs.edit().putString("radius_km",Double.toString(o.radiusKm())).putString("min_power_kw",Double.toString(o.minPowerKw())).putString("connector",o.connector()).putString("navigation",n.name()).apply();}
 public void saveTrip(Geo.Point start,Geo.Point end,String label){prefs.edit().putString("trip_start",start.lat()+","+start.lon()).putString("trip_end",end.lat()+","+end.lon()).putString("trip_label",label).apply();}
 public Trip trip(){try{String[] a=prefs.getString("trip_start","").split(","),b=prefs.getString("trip_end","").split(",");return new Trip(new Geo.Point(Double.parseDouble(a[0]),Double.parseDouble(a[1])),new Geo.Point(Double.parseDouble(b[0]),Double.parseDouble(b[1])),prefs.getString("trip_label","Rruga ime"));}catch(RuntimeException e){return null;}}
 public List<Place> places(String query)throws IOException{
  RegistryClient.checkCancelled();if(query.trim().matches("[-+0-9.]+\\s*,\\s*[-+0-9.]+")){try{String[] a=query.trim().split(",");return List.of(new Place(query,new Geo.Point(Double.parseDouble(a[0].trim()),Double.parseDouble(a[1].trim()))));}catch(IllegalArgumentException e){throw new IOException("Koordinata të pavlefshme.");}}
  if(!Geocoder.isPresent())throw new IOException("Përdor koordinatat latitude,longitude; kërkimi i adresave nuk është i disponueshëm.");
  List<Address> addresses=new Geocoder(context,Locale.getDefault()).getFromLocationName(query,5);List<Place> out=new ArrayList<>();
  if(addresses!=null)for(Address a:addresses)if(a.hasLatitude()&&a.hasLongitude())out.add(new Place(a.getAddressLine(0)==null?query:a.getAddressLine(0),new Geo.Point(a.getLatitude(),a.getLongitude())));
  if(out.isEmpty())throw new IOException("Vendi nuk u gjet. Provo qytetin dhe shtetin ose koordinatat.");return out;
 }
 public Result nearby(Geo.Point center,double radius,double power,String connector)throws Exception{return load(center,null,new SearchOptions(radius,power,connector));}
 public Result along(Geo.Point start,Geo.Point end,double radius,double power,String connector)throws Exception{
  String coordinates=start.lon()+","+start.lat()+";"+end.lon()+","+end.lat();JSONObject reply=null;
  for(String host:List.of("https://router.project-osrm.org","https://routing.openstreetmap.de/routed-car"))try{reply=new JSONObject(RegistryClient.http(host+"/route/v1/driving/"+coordinates+"?overview=full&geometries=geojson",new AtomicLong()));if(!"Ok".equals(reply.optString("code")))throw new IOException();break;}catch(Exception e){RegistryClient.checkCancelled();reply=null;}
  if(reply==null)throw new IOException("Itinerari nuk u llogarit. Provo përsëri.");JSONObject route=reply.getJSONArray("routes").getJSONObject(0);
  double distance=route.getDouble("distance");if(!Double.isFinite(distance)||distance<=0||distance>1_500_000)throw new IOException("Zgjidh itinerar deri në 1500 km.");
  JSONArray coords=route.getJSONObject("geometry").getJSONArray("coordinates");if(coords.length()<2||coords.length()>100000)throw new IOException("Gjeometria e rrugës nuk është e vlefshme.");List<Geo.Point> line=new ArrayList<>();
  for(int i=0;i<coords.length();i++){JSONArray p=coords.getJSONArray(i);line.add(new Geo.Point(p.getDouble(1),p.getDouble(0)));}
  return load(start,line,new SearchOptions(radius,power,connector));
 }
 private Result load(Geo.Point anchor,List<Geo.Point> line,SearchOptions o)throws Exception{
  double south=anchor.lat(),north=south,west=anchor.lon(),east=west;
  if(line!=null)for(Geo.Point p:line){south=Math.min(south,p.lat());north=Math.max(north,p.lat());west=Math.min(west,p.lon());east=Math.max(east,p.lon());}
  double lat=o.radiusKm()/110,lon=o.radiusKm()/(110*Math.max(.1,Math.cos(Math.toRadians(north+lat))));
  RegistryClient.Snapshot s=new RegistryClient(context).load(new double[]{south-lat,west-lon,north+lat,east+lon});RegistryClient.checkCancelled();
  return new Result(RegistryParser.parse(s.elements(),anchor,line,o),"Regjistri: "+s.fetchedAt()+(s.cached()?" · kopje e ruajtur, rifreskimi dështoi":"")+". Statusi aktual është i pakonfirmuar. Burime: OpenStreetMap/ODbL dhe regjistrat publikë me proveniencë në Udhëmbarë.");
 }
}
