package al.udhembare.auto;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.*;
import android.os.*;
import java.util.function.Consumer;

public final class DeviceLocation {
    private DeviceLocation() {}
    public static Runnable request(Context context, Consumer<Geo.Point> success, Consumer<String> failure) {
        Handler handler=new Handler(Looper.getMainLooper());
        if(context.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)!=PackageManager.PERMISSION_GRANTED) {
            failure.accept("Hap Udhëmbarë në telefon dhe lejo vendndodhjen."); return ()->{};
        }
        LocationManager manager=(LocationManager)context.getSystemService(Context.LOCATION_SERVICE);
        boolean[] done={false};
        LocationListener[] listener=new LocationListener[1];
        Runnable[] timeout=new Runnable[1];
        Runnable cancel=()->{
            done[0]=true;
            if(timeout[0]!=null)handler.removeCallbacks(timeout[0]);
            try {if(listener[0]!=null)manager.removeUpdates(listener[0]);}catch(SecurityException ignored){}
        };
        listener[0]=new LocationListener() {
            @Override public void onLocationChanged(Location location) {
                if(done[0]) return;
                if(SystemClock.elapsedRealtimeNanos()-location.getElapsedRealtimeNanos()>30_000_000_000L) return;
                if(!location.hasAccuracy()||location.getAccuracy()>200)return;
                cancel.run(); success.accept(new Geo.Point(location.getLatitude(),location.getLongitude()));
            }
            @Override public void onProviderDisabled(String provider) {}
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onStatusChanged(String p,int s,Bundle b) {}
        };
        boolean requested=false;
        try {
            for(String provider:new String[]{LocationManager.GPS_PROVIDER,LocationManager.NETWORK_PROVIDER}) {
                if(!manager.isProviderEnabled(provider)) continue;
                if(provider.equals(LocationManager.GPS_PROVIDER)&&context.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)!=PackageManager.PERMISSION_GRANTED) continue;
                manager.requestLocationUpdates(provider,1000,0,listener[0],Looper.getMainLooper()); requested=true;
            }
            if(!requested) { cancel.run(); failure.accept("Aktivizo vendndodhjen GPS në telefon."); }
            else {
                timeout[0]=()->{if(!done[0]) {cancel.run();failure.accept("Vendndodhja nuk u mor. Provo përsëri jashtë ose kërko sipas qytetit.");}};
                handler.postDelayed(timeout[0],20000);
            }
        } catch(SecurityException e) { cancel.run();failure.accept("Lejo vendndodhjen në cilësimet e telefonit."); }
        return cancel;
    }
}
