package al.udhembare.auto;
public enum NavigationTarget {
 WAZE("Waze",new String[]{"com.waze"}),GOOGLE_MAPS("Google Maps",new String[]{"com.google.android.apps.maps"}),OSMAND("OsmAnd",new String[]{"net.osmand.plus","net.osmand","net.osmand.dev"});
 public final String label;private final String[] packages;
 NavigationTarget(String label,String[] packages){this.label=label;this.packages=packages;}
 public String[] packages(){return packages.clone();}
 public String phoneUri(Geo.Point p){String coordinates=p.lat()+","+p.lon();return this==WAZE?"https://waze.com/ul?ll="+coordinates+"&navigate=yes":"google.navigation:q="+coordinates+"&mode=d";}
 public String carUri(Geo.Point p){return "geo:0,0?q="+p.lat()+","+p.lon();}
 public static NavigationTarget from(String value){for(NavigationTarget n:values())if(n.name().equals(value))return n;return WAZE;}
}
