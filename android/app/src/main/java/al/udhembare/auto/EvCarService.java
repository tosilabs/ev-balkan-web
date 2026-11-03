package al.udhembare.auto;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.os.Handler;
import android.os.Looper;
import androidx.car.app.*;
import androidx.car.app.model.*;
import androidx.car.app.validation.HostValidator;
import androidx.lifecycle.Lifecycle;
import androidx.lifecycle.LifecycleEventObserver;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;

public final class EvCarService extends CarAppService {
 @Override public HostValidator createHostValidator(){if((getApplicationInfo().flags&ApplicationInfo.FLAG_DEBUGGABLE)!=0)return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR;return new HostValidator.Builder(this).addAllowedHosts(androidx.car.app.R.array.hosts_allowlist_sample).build();}
 @Override public Session onCreateSession(){return new Session(){@Override public Screen onCreateScreen(Intent intent){return new Home(getCarContext());}};}
 static final class Home extends Screen {
  Home(CarContext c){super(c);}
  @Override public Template onGetTemplate(){Repository repo=new Repository(getCarContext());SearchOptions o=repo.options();ItemList.Builder list=new ItemList.Builder();
   list.addItem(row("Pranë meje",o.summary(),()->getScreenManager().push(new Results(getCarContext(),null,false,null))));
   list.addItem(row("Përgjatë rrugës","Zgjidh destinacionin · nisja me GPS",()->getScreenManager().push(new PlaceSearch(getCarContext(),true))));
   list.addItem(row("Pranë një vendi","Qytet, adresë ose koordinata",()->getScreenManager().push(new PlaceSearch(getCarContext(),false))));
   Repository.Trip trip=repo.trip();if(trip!=null)list.addItem(row("Rruga e përgatitur",trip.label()+" · nga nisja e ruajtur",()->getScreenManager().push(new Results(getCarContext(),trip.end(),true,trip.start()))));
   list.addItem(row("Filtrat",o.summary(),()->getScreenManager().push(new Filters(getCarContext(),0))));
   return new ListTemplate.Builder().setTitle("Udhëmbarë").setHeaderAction(Action.APP_ICON).setSingleList(list.build()).build();
  }
 }
 private static Row row(String title,String subtitle,Runnable click){return new Row.Builder().setTitle(title).addText(subtitle).setBrowsable(true).setOnClickListener(click::run).build();}
 static final class Filters extends Screen {
  final int kind;Filters(CarContext c,int kind){super(c);this.kind=kind;}
  @Override public Template onGetTemplate(){Repository repo=new Repository(getCarContext());SearchOptions o=repo.options();ItemList.Builder list=new ItemList.Builder();String title="Filtrat";
   if(kind==0){list.addItem(row("Lidhësi",o.connector(),()->getScreenManager().push(new Filters(getCarContext(),1))));list.addItem(row("Fuqia minimale",o.minPowerKw()+" kW",()->getScreenManager().push(new Filters(getCarContext(),2))));list.addItem(row("Rrezja / korridori",o.radiusKm()+" km",()->getScreenManager().push(new Filters(getCarContext(),3))));}
   else{String[] values=kind==1?new String[]{"Të dy","CCS2","Type 2"}:kind==2?new String[]{"0","22","50","150","300"}:new String[]{"0.3","1","5","10","25","100"};title=kind==1?"Lidhësi":kind==2?"Fuqia minimale":"Rrezja / korridori";
    for(String value:values){String label=kind==1?value:value+(kind==2?" kW":" km");list.addItem(new Row.Builder().setTitle(label).setOnClickListener(()->{repo.saveOptions(new SearchOptions(kind==3?Double.parseDouble(value):o.radiusKm(),kind==2?Double.parseDouble(value):o.minPowerKw(),kind==1?value:o.connector()),repo.navigation());getScreenManager().pop();}).build());}}
   return new ListTemplate.Builder().setTitle(title).setHeaderAction(Action.BACK).setSingleList(list.build()).build();
  }
 }
 private abstract static class TaskScreen extends Screen {
  final Repository repo;final ExecutorService worker=Executors.newSingleThreadExecutor();final Handler main=new Handler(Looper.getMainLooper());Future<?> pending;boolean closed,loading;String error="";long request;Runnable cancelLocation=()->{};
  TaskScreen(CarContext c){super(c);repo=new Repository(c);getLifecycle().addObserver((LifecycleEventObserver)(source,event)->{if(event==Lifecycle.Event.ON_DESTROY){closed=true;request++;cancelLocation.run();if(pending!=null)pending.cancel(true);worker.shutdownNow();}});}
  <T> void task(Callable<T> work,Consumer<T> ok){if(closed)return;if(pending!=null)pending.cancel(true);loading=true;error="";long token=++request;invalidate();pending=worker.submit(()->{try{T value=work.call();main.post(()->{if(!closed&&token==request){loading=false;ok.accept(value);invalidate();}});}catch(Exception e){main.post(()->{if(!closed&&token==request){loading=false;error=e.getMessage()==null?"Kërkimi dështoi.":e.getMessage();invalidate();}});}});}
  void fail(String message){if(!closed){loading=false;error=message;invalidate();}}
 }
 private static final class PlaceSearch extends TaskScreen {
  final boolean route;List<Repository.Place> places=List.of();PlaceSearch(CarContext c,boolean route){super(c);this.route=route;}
  @Override public Template onGetTemplate(){SearchTemplate.Builder template=new SearchTemplate.Builder(new SearchTemplate.SearchCallback(){@Override public void onSearchSubmitted(String text){if(!text.trim().isEmpty()){places=List.of();task(()->repo.places(text.trim()),v->places=v);}}}).setHeaderAction(Action.BACK).setSearchHint(route?"Destinacioni i rrugës":"Qyteti ose adresa").setLoading(loading);
   if(!loading){ItemList.Builder rows=new ItemList.Builder().setNoItemsMessage(error.isEmpty()?"Shkruaj ose thuaj vendin, pastaj kërko.":error);for(Repository.Place place:places)rows.addItem(row(place.label(),"Zgjidh këtë vend",()->getScreenManager().push(new Results(getCarContext(),place.point(),route,null))));template.setItemList(rows.build());}return template.build();
  }
 }
 private static final class Results extends TaskScreen {
  Repository.Result result;final SearchOptions options;final Geo.Point end,start;final boolean along;int page;
  Results(CarContext c,Geo.Point end,boolean along,Geo.Point start){super(c);this.end=end;this.along=along;this.start=start;options=repo.options();load();}
  void load(){cancelLocation.run();if(pending!=null)pending.cancel(true);request++;page=0;result=null;error="";loading=true;invalidate();
   if(end!=null&&!along)task(()->repo.nearby(end,options.radiusKm(),options.minPowerKw(),options.connector()),v->result=v);
   else if(start!=null)task(()->repo.along(start,end,options.radiusKm(),options.minPowerKw(),options.connector()),v->result=v);
   else cancelLocation=DeviceLocation.request(getCarContext(),point->{if(closed)return;if(along)task(()->repo.along(point,end,options.radiusKm(),options.minPowerKw(),options.connector()),v->result=v);else task(()->repo.nearby(point,options.radiusKm(),options.minPowerKw(),options.connector()),v->result=v);},this::fail);
  }
  @Override public Template onGetTemplate(){return CarUi.results(getCarContext(),result,loading,error,page,s->getScreenManager().push(new Detail(getCarContext(),s,result.note())),value->{page=value;invalidate();},this::load);}
 }
 private static final class Detail extends Screen {
  final Station station;final String note;Detail(CarContext c,Station station,String note){super(c);this.station=station;this.note=note;}
  @Override public Template onGetTemplate(){return CarUi.detail(getCarContext(),station,note);}
 }
}
