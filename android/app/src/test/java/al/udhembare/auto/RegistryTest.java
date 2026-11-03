package al.udhembare.auto;
import org.junit.Test;
import org.json.*;
import java.util.*;
import static org.junit.Assert.*;
public class RegistryTest {
 private JSONObject site(String id,double lat,double lon,String key,String output)throws Exception{return new JSONObject().put("type","node").put("id",id).put("lat",lat).put("lon",lon).put("tags",new JSONObject().put("name","Stacion "+id).put("socket:"+key,"2").put("socket:"+key+":output",output));}
 @Test public void compatibleSocketsAndPowerMustMatchSameConnector()throws Exception{
  JSONObject s=site("1",42,21,"type2","22 kW");s.getJSONObject("tags").put("socket:type2_combo","1").put("socket:type2_combo:output","150000 W");
  JSONArray values=new JSONArray().put(s);assertEquals(1,RegistryParser.parse(values,new Geo.Point(42,21),null,new SearchOptions(10,100,"CCS2")).size());
  assertTrue(RegistryParser.parse(values,new Geo.Point(42,21),null,new SearchOptions(10,100,"Type 2")).isEmpty());assertEquals(150,RegistryParser.power("150000 W"),0);
 }
 @Test public void privateAndClosedAndMalformedPointsAreNotShown()throws Exception{
  JSONArray list=new JSONArray();JSONObject a=site("1",42,21,"type2_combo","50 kW");a.getJSONObject("tags").put("access","private");list.put(a);
  JSONObject b=site("2",42,21,"type2_combo","50 kW");b.getJSONObject("tags").put("operational_status","closed");list.put(b);list.put(site("3",999,21,"type2_combo","50 kW"));list.put(site("4",42,21,"type2_combo","50 kW"));
  List<Station> result=RegistryParser.parse(list,new Geo.Point(42,21),null,SearchOptions.defaults());assertEquals(1,result.size());assertEquals("node/4",result.get(0).id());
 }
 @Test public void routeResultsFollowTravelOrderInsteadOfClosestRoadOffset()throws Exception{
  List<Geo.Point> line=List.of(new Geo.Point(42,21),new Geo.Point(42,21.1));JSONArray list=new JSONArray().put(site("2",42,21.08,"type2_combo","150 kW")).put(site("1",42.001,21.01,"type2_combo","150 kW"));
  List<Station> result=RegistryParser.parse(list,line.get(0),line,new SearchOptions(1,0,"CCS2"));assertEquals("node/1",result.get(0).id());assertTrue(result.get(0).along());assertTrue(result.get(1).progressKm()>result.get(0).progressKm());
 }
 @Test public void explicitConnectionsAndSnapshotGenerationAreRespected()throws Exception{
  JSONObject s=site("1",42,21,"type2","22 kW").put("connections",new JSONArray().put(new JSONObject().put("label","CCS2").put("power",300)));
  assertEquals(300,RegistryParser.parse(new JSONArray().put(s),new Geo.Point(42,21),null,SearchOptions.defaults()).get(0).power(),0);
  try{RegistryParser.validateTile(new JSONObject().put("builtAt","old").put("elements",new JSONArray()),"new");fail("Mixed snapshots must be rejected");}catch(IllegalArgumentException expected){}
 }
 @Test public void navigationUsesValidatedCoordinatesAndSeparatePackages(){Geo.Point p=new Geo.Point(42,21);assertTrue(NavigationTarget.WAZE.phoneUri(p).contains("navigate=yes"));assertTrue(NavigationTarget.GOOGLE_MAPS.phoneUri(p).startsWith("google.navigation:"));assertEquals("geo:0,0?q=42.0,21.0",NavigationTarget.WAZE.carUri(p));try{new SearchOptions(.1,0,"CCS2");fail();}catch(IllegalArgumentException expected){}}
}
