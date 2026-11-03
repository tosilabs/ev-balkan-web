package al.udhembare.auto;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.car.app.CarContext;
import androidx.car.app.constraints.ConstraintManager;
import androidx.car.app.model.*;
import java.util.*;
import java.util.function.*;

final class CarUi {
 private CarUi(){}
 static int limit(CarContext context){int value=6;if(context.getCarAppApiLevel()>=2)try{value=context.getCarService(ConstraintManager.class).getContentLimit(ConstraintManager.CONTENT_LIMIT_TYPE_PLACE_LIST);}catch(RuntimeException ignored){}return Math.max(1,Math.min(6,value));}
 static Template results(CarContext c,Repository.Result result,boolean loading,String error,int page,Consumer<Station> select,IntConsumer changePage,Runnable retry){
  PlaceListMapTemplate.Builder template=new PlaceListMapTemplate.Builder().setTitle("Karikuesit · Udhëmbarë").setHeaderAction(Action.BACK).setLoading(loading);
  template.setCurrentLocationEnabled(c.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION)==PackageManager.PERMISSION_GRANTED||c.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)==PackageManager.PERMISSION_GRANTED);
  if(!loading){ItemList.Builder rows=new ItemList.Builder().setNoItemsMessage(error.isEmpty()?"Nuk u gjetën pika me këta filtra.":error);
   int count=result==null?0:result.stations().size(),limit=limit(c),start=Math.min(page*limit,Math.max(0,count-1)),end=Math.min(count,start+limit);
   if(count>0)template.setTitle((start+1)+"–"+end+" nga "+count+" karikues");
   if(result!=null)for(int i=start;i<end;i++){
    Station s=result.stations().get(i);Place place=new Place.Builder(CarLocation.create(s.point().lat(),s.point().lon())).setMarker(new PlaceMarker.Builder().setLabel(Integer.toString(i-start+1)).build()).build();
    rows.addItem(new Row.Builder().setTitle((i-start+1)+". "+s.name()).addText(s.summary()).addText("Status aktual i pakonfirmuar").setBrowsable(true).setMetadata(new Metadata.Builder().setPlace(place).build()).setOnClickListener(()->select.accept(s)).build());
   }
   template.setItemList(rows.build());ActionStrip.Builder actions=new ActionStrip.Builder();boolean any=false;
   if(start>0){actions.addAction(new Action.Builder().setTitle("Më parë").setOnClickListener(()->changePage.accept(Math.max(0,page-1))).build());any=true;}
   if(end<count){actions.addAction(new Action.Builder().setTitle("Të tjerët").setOnClickListener(()->changePage.accept(page+1)).build());any=true;}
   if(!any)actions.addAction(new Action.Builder().setTitle("Rifresko").setOnClickListener(retry::run).build());template.setActionStrip(actions.build());
  }
  return template.build();
 }
 static Template detail(CarContext context,Station station,String note){
  Pane pane=new Pane.Builder()
   .addRow(new Row.Builder().setTitle(station.name()).addText(station.summary()).addText(station.address().isEmpty()?"Adresa e paspecifikuar":station.address()).build())
   .addRow(new Row.Builder().setTitle(station.provider()).addText(station.hours().isBlank()?"Orari: i panjohur":"Orari: "+station.hours()).addText(station.tariff().isBlank()?"Tarifa: e panjohur":"Tarifë e raportuar: "+station.tariff()).build())
   .addRow(new Row.Builder().setTitle("Status aktual i pakonfirmuar").addText(station.source()+" · "+station.updated()).addText(note).build())
   .addAction(new Action.Builder().setTitle("Waze").setOnClickListener(()->Navigation.car(context,NavigationTarget.WAZE,station.point())).build())
   .addAction(new Action.Builder().setTitle("Google Maps").setOnClickListener(()->Navigation.car(context,NavigationTarget.GOOGLE_MAPS,station.point())).build()).build();
  return new PaneTemplate.Builder(pane).setTitle("Karikuesi").setHeaderAction(Action.BACK).build();
 }
}
