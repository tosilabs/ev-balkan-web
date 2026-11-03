package al.udhembare.auto;
import android.content.Context;
import android.Manifest;
import androidx.test.core.app.ApplicationProvider;
import androidx.car.app.testing.TestCarContext;
import androidx.car.app.model.*;
import org.junit.*;
import org.junit.runner.RunWith;
import org.robolectric.RobolectricTestRunner;
import org.robolectric.annotation.Config;
import org.robolectric.Shadows;
import java.util.*;
import static org.junit.Assert.*;
@RunWith(RobolectricTestRunner.class) @Config(sdk=34)
public class CarUiTest {
 private TestCarContext context;
 private Station station(int i){return new Station("node/"+i,"Karikues "+i,new Geo.Point(42,21+i*.001),"Shkup","CCS2",150,"0.45 EUR/kWh","Operator","24/7","OpenStreetMap","2026-11-03",i,0,false);}
 @Before public void setup(){Context app=ApplicationProvider.getApplicationContext();context=TestCarContext.createCarContext(app);}
 @Test public void mapTemplateAcceptsNumberedBrowsablePlacesAndPagination(){List<Station> stations=new ArrayList<>();for(int i=1;i<=12;i++)stations.add(station(i));PlaceListMapTemplate template=(PlaceListMapTemplate)CarUi.results(context,new Repository.Result(stations,"Burimi"),false,"",0,s->{},p->{},()->{});assertNotNull(template.getItemList());assertTrue(template.getItemList().getItems().size()<=6);Row row=(Row)template.getItemList().getItems().get(0);assertTrue(row.isBrowsable());assertNotNull(row.getMetadata().getPlace());assertFalse(template.isCurrentLocationEnabled());}
 @Test public void loadingErrorsAndStationDetailsRespectTemplateConstraints(){assertTrue(((PlaceListMapTemplate)CarUi.results(context,null,true,"",0,s->{},p->{},()->{})).isLoading());PlaceListMapTemplate error=(PlaceListMapTemplate)CarUi.results(context,null,false,"Pa internet",0,s->{},p->{},()->{});assertEquals(0,error.getItemList().getItems().size());PaneTemplate detail=(PaneTemplate)CarUi.detail(context,station(1),"Status i pakonfirmuar");assertEquals(2,detail.getPane().getActions().size());assertEquals(3,detail.getPane().getRows().size());}
 @Test public void phoneSettingsAndManualRoutePersistAcrossRepositoryInstances(){Repository a=new Repository(context);a.saveOptions(new SearchOptions(.3,150,"CCS2"),NavigationTarget.GOOGLE_MAPS);a.saveTrip(new Geo.Point(42,21),new Geo.Point(43,22),"Rruga ime");Repository b=new Repository(context);assertEquals(.3,b.options().radiusKm(),0);assertEquals("CCS2",b.options().connector());assertEquals(NavigationTarget.GOOGLE_MAPS,b.navigation());assertEquals(43,b.trip().end().lat(),0);}
}
