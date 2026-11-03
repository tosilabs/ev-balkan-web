package al.udhembare.auto;

import android.content.*;
import android.net.Uri;
import androidx.car.app.*;

public final class Navigation {
    private Navigation(){}
    private static String installed(Context context,NavigationTarget target){
        for(String name:target.packages()) {
            try { context.getPackageManager().getApplicationInfo(name,0); return name; }
            catch(android.content.pm.PackageManager.NameNotFoundException ignored){}
        }
        return null;
    }
    public static void phone(Context context,NavigationTarget target,Geo.Point point){
        String name=installed(context,target);
        if(name==null)throw new ActivityNotFoundException(target.label+" nuk është instaluar. Instaloje ose zgjidh aplikacionin tjetër te cilësimet.");
        context.startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(target.phoneUri(point))).setPackage(name));
    }
    public static void car(CarContext context,NavigationTarget target,Geo.Point point){
        String name=installed(context,target);
        if(name==null){CarToast.makeText(context,target.label+" nuk është instaluar në telefon.",CarToast.LENGTH_LONG).show();return;}
        try {context.startCarApp(new Intent(CarContext.ACTION_NAVIGATE,Uri.parse(target.carUri(point))).setPackage(name));}
        catch(HostException|IllegalArgumentException|SecurityException e){CarToast.makeText(context,"Navigimi nuk u hap. Kontrollo "+target.label+" në Android Auto.",CarToast.LENGTH_LONG).show();}
    }
}
