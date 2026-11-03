package al.udhembare.auto;

/** Validated settings shared by the phone and the car screens. */
public record SearchOptions(double radiusKm, double minPowerKw, String connector) {
    public SearchOptions {
        if(!Double.isFinite(radiusKm)||radiusKm<.3||radiusKm>100||
           !Double.isFinite(minPowerKw)||minPowerKw<0||minPowerKw>1000||
           !("Të dy".equals(connector)||"CCS2".equals(connector)||"Type 2".equals(connector)))
            throw new IllegalArgumentException("Vendos rreze 0.3–100 km, fuqi 0–1000 kW dhe lidhës të vlefshëm.");
    }
    public static SearchOptions defaults(){return new SearchOptions(10,0,"Të dy");}
    public String summary(){return String.format(java.util.Locale.ROOT,"%.1f km · %s · ≥ %.1f kW",radiusKm,connector,minPowerKw);}
}
