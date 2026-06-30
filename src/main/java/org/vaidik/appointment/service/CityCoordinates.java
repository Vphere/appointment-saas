package org.vaidik.appointment.service;

import java.util.HashMap;
import java.util.Map;

public final class CityCoordinates {

    private CityCoordinates() {}

    private static final Map<String, double[]> MAP = new HashMap<>();

    static {
        // ── Major Indian cities ──────────────────────────────────────
        MAP.put("mumbai",       new double[]{19.0760, 72.8777});
        MAP.put("delhi",        new double[]{28.6139, 77.2090});
        MAP.put("new delhi",    new double[]{28.6139, 77.2090});
        MAP.put("bengaluru",    new double[]{12.9716, 77.5946});
        MAP.put("bangalore",    new double[]{12.9716, 77.5946});
        MAP.put("hyderabad",    new double[]{17.3850, 78.4867});
        MAP.put("ahmedabad",    new double[]{23.0225, 72.5714});
        MAP.put("chennai",      new double[]{13.0827, 80.2707});
        MAP.put("kolkata",      new double[]{22.5726, 88.3639});
        MAP.put("surat",        new double[]{21.1702, 72.8311});
        MAP.put("pune",         new double[]{18.5204, 73.8567});
        MAP.put("jaipur",       new double[]{26.9124, 75.7873});
        MAP.put("lucknow",      new double[]{26.8467, 80.9462});
        MAP.put("kanpur",       new double[]{26.4499, 80.3319});
        MAP.put("nagpur",       new double[]{21.1458, 79.0882});
        MAP.put("indore",       new double[]{22.7196, 75.8577});
        MAP.put("thane",        new double[]{19.2183, 72.9781});
        MAP.put("bhopal",       new double[]{23.2599, 77.4126});
        MAP.put("visakhapatnam",new double[]{17.6868, 83.2185});
        MAP.put("patna",        new double[]{25.5941, 85.1376});
        MAP.put("vadodara",     new double[]{22.3072, 73.1812});
        MAP.put("baroda",       new double[]{22.3072, 73.1812});
        MAP.put("ghaziabad",    new double[]{28.6692, 77.4538});
        MAP.put("ludhiana",     new double[]{30.9010, 75.8573});
        MAP.put("agra",         new double[]{27.1767, 78.0081});
        MAP.put("nashik",       new double[]{19.9975, 73.7898});
        MAP.put("faridabad",    new double[]{28.4089, 77.3178});
        MAP.put("meerut",       new double[]{28.9845, 77.7064});
        MAP.put("rajkot",       new double[]{22.3039, 70.8022});
        MAP.put("kalyan",       new double[]{19.2437, 73.1355});
        MAP.put("vasai",        new double[]{19.3919, 72.8397});
        MAP.put("varanasi",     new double[]{25.3176, 82.9739});
        MAP.put("srinagar",     new double[]{34.0837, 74.7973});
        MAP.put("aurangabad",   new double[]{19.8762, 75.3433});
        MAP.put("dhanbad",      new double[]{23.7957, 86.4304});
        MAP.put("amritsar",     new double[]{31.6340, 74.8723});
        MAP.put("navi mumbai",  new double[]{19.0330, 73.0297});
        MAP.put("allahabad",    new double[]{25.4358, 81.8463});
        MAP.put("prayagraj",    new double[]{25.4358, 81.8463});
        MAP.put("howrah",       new double[]{22.5958, 88.2636});
        MAP.put("coimbatore",   new double[]{11.0168, 76.9558});
        MAP.put("jabalpur",     new double[]{23.1815, 79.9864});
        MAP.put("gwalior",      new double[]{26.2183, 78.1828});
        MAP.put("vijayawada",   new double[]{16.5062, 80.6480});
        MAP.put("jodhpur",      new double[]{26.2389, 73.0243});
        MAP.put("madurai",      new double[]{9.9252, 78.1198});
        MAP.put("raipur",       new double[]{21.2514, 81.6296});
        MAP.put("kota",         new double[]{25.2138, 75.8648});
        MAP.put("guwahati",     new double[]{26.1445, 91.7362});
        MAP.put("chandigarh",   new double[]{30.7333, 76.7794});
        MAP.put("solapur",      new double[]{17.6805, 75.9064});
        MAP.put("hubli",        new double[]{15.3647, 75.1240});
        MAP.put("mysuru",       new double[]{12.2958, 76.6394});
        MAP.put("mysore",       new double[]{12.2958, 76.6394});
        MAP.put("tiruchirappalli", new double[]{10.7905, 78.7047});
        MAP.put("bareilly",     new double[]{28.3670, 79.4304});
        MAP.put("moradabad",    new double[]{28.8386, 78.7733});
        MAP.put("tiruppur",     new double[]{11.1085, 77.3411});
        MAP.put("gurgaon",      new double[]{28.4595, 77.0266});
        MAP.put("gurugram",     new double[]{28.4595, 77.0266});
        MAP.put("noida",        new double[]{28.5355, 77.3910});
        MAP.put("aligarh",      new double[]{27.8974, 78.0880});
        MAP.put("jalandhar",    new double[]{31.3260, 75.5762});
        MAP.put("bhubaneswar",  new double[]{20.2961, 85.8245});
        MAP.put("salem",        new double[]{11.6643, 78.1460});
        MAP.put("mira bhayandar", new double[]{19.2952, 72.8544});
        MAP.put("thiruvananthapuram", new double[]{8.5241, 76.9366});
        MAP.put("trivandrum",   new double[]{8.5241, 76.9366});
        MAP.put("bhiwandi",     new double[]{19.2967, 73.0631});
        MAP.put("saharanpur",   new double[]{29.9680, 77.5510});
        MAP.put("guntur",       new double[]{16.2979, 80.4575});
        MAP.put("amravati",     new double[]{20.9320, 77.7523});
        MAP.put("bikaner",      new double[]{28.0229, 73.3119});
        MAP.put("noida extension", new double[]{28.6219, 77.5030});
        MAP.put("dehradun",     new double[]{30.3165, 78.0322});
        MAP.put("durgapur",     new double[]{23.5204, 87.3119});
        MAP.put("asansol",      new double[]{23.6739, 86.9524});
        MAP.put("nanded",       new double[]{19.1383, 77.3210});
        MAP.put("kolhapur",     new double[]{16.7050, 74.2433});
        MAP.put("ajmer",        new double[]{26.4499, 74.6399});
        MAP.put("gulbarga",     new double[]{17.3297, 76.8200});
        MAP.put("jamshedpur",   new double[]{22.8046, 86.2029});
        MAP.put("ujjain",       new double[]{23.1765, 75.7885});
        MAP.put("siliguri",     new double[]{26.7271, 88.3953});
        MAP.put("mangalore",    new double[]{12.9141, 74.8560});
        MAP.put("udaipur",      new double[]{24.5854, 73.7125});
        MAP.put("belgaum",      new double[]{15.8497, 74.4977});
        MAP.put("belagavi",     new double[]{15.8497, 74.4977});
        MAP.put("kochi",        new double[]{9.9312, 76.2673});
        MAP.put("cochin",       new double[]{9.9312, 76.2673});
        MAP.put("kozhikode",    new double[]{11.2588, 75.7804});
        MAP.put("calicut",      new double[]{11.2588, 75.7804});

        // ── A few global cities for international users ───────────────
        MAP.put("london",       new double[]{51.5074, -0.1278});
        MAP.put("new york",     new double[]{40.7128, -74.0060});
        MAP.put("san francisco",new double[]{37.7749, -122.4194});
        MAP.put("dubai",        new double[]{25.2048, 55.2708});
        MAP.put("singapore",    new double[]{1.3521, 103.8198});
        MAP.put("sydney",       new double[]{-33.8688, 151.2093});
        MAP.put("toronto",      new double[]{43.6532, -79.3832});
    }

    public static double[] get(String cityLowercase) {
        return MAP.get(cityLowercase);
    }
}