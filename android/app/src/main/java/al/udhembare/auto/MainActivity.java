package al.udhembare.auto;
import android.Manifest;
import android.app.*;
import android.content.*;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.InputType;
import android.view.*;
import android.widget.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;

/** Native phone setup/search; the car service renders its own host-approved templates. */
public final class MainActivity extends Activity {
 private Repository repo;private final ExecutorService worker=Executors.newSingleThreadExecutor();private Future<?> pending;
 private LinearLayout root,results;private EditText query,origin,radius,power;private Spinner connector,navigator;private TextView status;
 private final List<View> controls=new ArrayList<>();private Runnable cancelLocation=()->{};private boolean busy;private long generation;
 private static final int INK=0xff152d46,BLUE=0xff0758d6;private int dp(int v){return Math.round(v*getResources().getDisplayMetrics().density);}
 @Override public void onCreate(Bundle state){super.onCreate(state);repo=new Repository(this);getWindow().setStatusBarColor(BLUE);getWindow().setNavigationBarColor(Color.WHITE);
  ScrollView scroll=new ScrollView(this);root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(22),dp(20),dp(32));root.setBackgroundColor(0xfff4f7fc);root.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(dp(20),dp(22)+insets.getSystemWindowInsetTop(),dp(20),dp(32)+insets.getSystemWindowInsetBottom());return insets;});scroll.addView(root);setContentView(scroll);
  TextView brand=title("ϟ Udhëmbarë",30);brand.setTypeface(null,Typeface.BOLD);title("Karikuesit e tu, edhe në Android Auto.",15);
  button("Lejo vendndodhjen",()->requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION,Manifest.permission.ACCESS_COARSE_LOCATION},42));
  query=field("Destinacioni",repo.prefs.getString("last_query",""),"Qytet, adresë ose 42.0,21.4");
  origin=field("Nisja manuale · opsionale",repo.prefs.getString("last_origin",""),"Bosh = vendndodhja ime");
  SearchOptions o=repo.options();
  radius=field("Rrezja / korridori · km",Double.toString(o.radiusKm()),"0.3–100");radius.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);
  power=field("Fuqia minimale · kW",Double.toString(o.minPowerKw()),"0–1000");power.setInputType(InputType.TYPE_CLASS_NUMBER|InputType.TYPE_NUMBER_FLAG_DECIMAL);
  title("Lidhësi",13);connector=spinner(new String[]{"Të dy","CCS2","Type 2"},Arrays.asList("Të dy","CCS2","Type 2").indexOf(o.connector()));
  title("Navigimi",13);navigator=spinner(new String[]{"Waze","Google Maps","OsmAnd"},repo.navigation().ordinal());connector.setContentDescription("Lidhësi i karikimit");navigator.setContentDescription("Aplikacioni i navigimit");
  button("Ruaj filtrat për Android Auto",()->{try{save();status.setText("Filtrat u ruajtën për telefonin dhe veturën.");}catch(IllegalArgumentException e){fail(e.getMessage());}});
  button("◎ Pranë meje",()->search(0));button("↝ Përgjatë rrugës",()->search(1));button("⌖ Pranë destinacionit",()->search(2));
  Button cancel=new Button(this);cancel.setText("Anulo kërkimin");cancel.setAllCaps(false);root.addView(cancel);cancel.setOnClickListener(v->{if(busy){generation++;cancelLocation.run();if(pending!=null)pending.cancel(true);fail("Kërkimi u anulua.");}});
  status=title("Pa çelës API. Përgatite rrugën këtu; pastaj hape Udhëmbarë në Android Auto.",14);status.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);
  results=new LinearLayout(this);results.setOrientation(LinearLayout.VERTICAL);root.addView(results);
  button("Hap hartën web ↗",()->open("https://tosilabs.github.io/ev-balkan-web/"));
  button("Instalimi në Android Auto ↗",()->open("https://github.com/tosilabs/ev-balkan-web/blob/main/android/README.md"));
  title("OpenStreetMap / ODbL dhe regjistra publikë. Statusi aktual i karikuesve është i pakonfirmuar; tarifat janë të raportuara. Kjo APK është për testim. Për veturën përdor Google Play Internal Testing / Internal App Sharing; instalimi direkt nuk mjafton për aplikacionet me Car App Library.",12);
 }
 private TextView title(String s,int size){TextView v=new TextView(this);v.setText(s);v.setTextSize(size);v.setTextColor(INK);v.setPadding(0,dp(8),0,dp(8));root.addView(v);return v;}
 private EditText field(String label,String value,String hint){TextView t=title(label,13);EditText v=new EditText(this);v.setId(View.generateViewId());t.setLabelFor(v.getId());v.setText(value);v.setHint(hint);v.setTextColor(INK);v.setTextSize(16);v.setSingleLine(true);v.setMinHeight(dp(48));root.addView(v);controls.add(v);return v;}
 private Spinner spinner(String[] values,int selected){Spinner v=new Spinner(this);v.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,values));v.setSelection(Math.max(0,selected));v.setMinimumHeight(dp(48));root.addView(v);controls.add(v);return v;}
 private void button(String text,Runnable run){Button b=new Button(this);b.setText(text);b.setAllCaps(false);b.setMinHeight(dp(48));b.setTextColor(BLUE);root.addView(b);controls.add(b);b.setOnClickListener(v->run.run());}
 private SearchOptions save(){try{SearchOptions o=new SearchOptions(Double.parseDouble(radius.getText().toString().replace(',','.')),Double.parseDouble(power.getText().toString().replace(',','.')),connector.getSelectedItem().toString());repo.saveOptions(o,NavigationTarget.values()[navigator.getSelectedItemPosition()]);repo.prefs.edit().putString("last_query",query.getText().toString().trim()).putString("last_origin",origin.getText().toString().trim()).apply();return o;}catch(NumberFormatException e){throw new IllegalArgumentException("Vendos numra për rrezen dhe fuqinë.");}}
 private void setBusy(boolean value){busy=value;for(View v:controls)v.setEnabled(!value);}
 private void fail(String message){setBusy(false);status.setText(message);}
 private <T> void task(Callable<T> work,Consumer<T> ok){long token=generation;pending=worker.submit(()->{try{T value=work.call();runOnUiThread(()->{if(!isDestroyed()&&token==generation)ok.accept(value);});}catch(Exception e){runOnUiThread(()->{if(!isDestroyed()&&token==generation)fail(e.getMessage()==null?"Kërkimi dështoi.":e.getMessage());});}});}
 private void location(Consumer<Geo.Point> ok){long token=generation;cancelLocation=DeviceLocation.request(this,p->{if(!isDestroyed()&&token==generation)ok.accept(p);},e->{if(!isDestroyed()&&token==generation)fail(e+" Mund të caktosh nisjen manualisht.");});}
 private void choose(String q,String label,Consumer<Geo.Point> ok){task(()->repo.places(q),places->{new AlertDialog.Builder(this).setTitle(label).setItems(places.stream().map(Repository.Place::label).toArray(String[]::new),(dialog,index)->ok.accept(places.get(index).point())).setOnCancelListener(d->fail("Kërkimi u anulua.")).show();});}
 private void search(int mode){if(busy)return;SearchOptions o;try{o=save();}catch(IllegalArgumentException e){fail(e.getMessage());return;}String q=query.getText().toString().trim();if(mode!=0&&q.isEmpty()){fail("Shkruaj destinacionin.");return;}
  generation++;setBusy(true);results.removeAllViews();status.setText("Duke kërkuar…");
  if(mode==0)location(p->task(()->repo.nearby(p,o.radiusKm(),o.minPowerKw(),o.connector()),this::show));
  else choose(q,"Zgjidh destinacionin",end->{if(mode==2)task(()->repo.nearby(end,o.radiusKm(),o.minPowerKw(),o.connector()),this::show);else{Consumer<Geo.Point> start=p->{repo.saveTrip(p,end,q);task(()->repo.along(p,end,o.radiusKm(),o.minPowerKw(),o.connector()),this::show);};String from=origin.getText().toString().trim();if(from.isEmpty())location(start);else choose(from,"Zgjidh nisjen",start);}});
 }
 private void show(Repository.Result value){setBusy(false);status.setText(value.stations().size()+" karikues. "+value.note());int i=0;
  for(Station station:value.stations()){if(i>=100)break;int number=++i;LinearLayout card=new LinearLayout(this);card.setOrientation(LinearLayout.VERTICAL);card.setPadding(dp(15),dp(14),dp(15),dp(14));GradientDrawable bg=new GradientDrawable();bg.setColor(Color.WHITE);bg.setCornerRadius(dp(18));card.setBackground(bg);LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(-1,-2);lp.setMargins(0,dp(8),0,dp(8));results.addView(card,lp);
   TextView name=new TextView(this);name.setText(number+". "+station.name());name.setTextColor(INK);name.setTextSize(19);name.setTypeface(null,Typeface.BOLD);card.addView(name);
   TextView info=new TextView(this);info.setText(station.summary());info.setTextColor(INK);info.setPadding(0,dp(8),0,dp(8));card.addView(info);
   Button nav=new Button(this);nav.setText("Navigo me "+repo.navigation().label);nav.setAllCaps(false);card.addView(nav);nav.setOnClickListener(v->{try{Navigation.phone(this,repo.navigation(),station.point());}catch(ActivityNotFoundException|SecurityException e){new AlertDialog.Builder(this).setMessage("Instalo "+repo.navigation().label+" ose zgjidh një aplikacion tjetër.").setPositiveButton("Mbyll",null).show();}});
   Button details=new Button(this);details.setText("Detajet");details.setAllCaps(false);card.addView(details);details.setOnClickListener(v->new AlertDialog.Builder(this).setTitle(station.name()).setMessage(station.details()+"\n\n"+value.note()).setPositiveButton("Mbyll",null).show());
  }
  if(value.stations().size()>100)status.append(" Shfaqen 100 të parët; ngushto rrezen për rezultate të tjera.");
 }
 private void open(String url){try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}catch(ActivityNotFoundException e){status.setText("Nuk u gjet shfletues në telefon.");}}
 @Override protected void onDestroy(){generation++;cancelLocation.run();if(pending!=null)pending.cancel(true);worker.shutdownNow();super.onDestroy();}
}
