package al.udhembare.auto;

import java.util.List;

/** Distances in kilometres; coordinates in WGS84 degrees. */
public final class Geo {
    private Geo() {}
    public record Point(double lat, double lon) {
        public Point {
            if (!Double.isFinite(lat) || !Double.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180)
                throw new IllegalArgumentException("Koordinata të pavlefshme");
        }
    }
    public static double distance(Point a, Point b) {
        double p=Math.toRadians(a.lat), q=Math.toRadians(b.lat);
        double h=Math.pow(Math.sin((q-p)/2),2)+Math.cos(p)*Math.cos(q)*Math.pow(Math.sin(Math.toRadians(b.lon-a.lon)/2),2);
        return 6371.0088*2*Math.asin(Math.sqrt(Math.min(1,h)));
    }
    public record Projection(double offsetKm,double alongKm) {}
    public static double corridorDistance(Point p,List<Point> route){return project(p,route).offsetKm();}
    public static Projection project(Point p,List<Point> route){
        if(route.isEmpty())throw new IllegalArgumentException("Itinerari është bosh");
        double best=distance(p,route.get(0)),along=0,total=0;
        for(int i=1;i<route.size();i++){
            Point a=route.get(i-1),b=route.get(i);double scale=Math.cos(Math.toRadians(p.lat));
            double ax=Math.toRadians(a.lon-p.lon)*6371.0088*scale,ay=Math.toRadians(a.lat-p.lat)*6371.0088;
            double bx=Math.toRadians(b.lon-p.lon)*6371.0088*scale,by=Math.toRadians(b.lat-p.lat)*6371.0088;
            double dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy,t=d==0?0:Math.max(0,Math.min(1,-(ax*dx+ay*dy)/d));
            double offset=Math.hypot(ax+t*dx,ay+t*dy),length=distance(a,b);
            if(offset<best){best=offset;along=total+t*length;}total+=length;
        }
        return new Projection(best,along);
    }
}
