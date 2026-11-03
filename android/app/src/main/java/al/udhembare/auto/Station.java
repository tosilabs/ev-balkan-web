package al.udhembare.auto;
import java.util.Locale;
public record Station(String id,String name,Geo.Point point,String address,String connectors,double power,
 String tariff,String provider,String hours,String source,String updated,double distanceKm,double progressKm,boolean along) {
 public String summary(){String position=along?String.format(Locale.ROOT,"%.1f km përgjatë rrugës · %.0f m nga vija",progressKm,distanceKm*1000):String.format(Locale.ROOT,"%.1f km në vijë ajrore",distanceKm);return position+" · "+connectors+" · "+(power>0?String.format(Locale.ROOT,"deri %.0f kW",power):"kW të panjohura");}
 public String details(){return address+"\n"+summary()+"\nOperatori: "+provider+"\nOrari: "+(hours.isBlank()?"i panjohur":hours)+"\nStatusi aktual: i pakonfirmuar\n"+(tariff.isBlank()?"Çmimi i panjohur":"Tarifë e raportuar: "+tariff)+"\nBurimi: "+source+"\nRegjistri: "+updated;}
}
