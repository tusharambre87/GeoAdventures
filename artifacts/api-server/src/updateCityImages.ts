import { db } from "./db";
import { dailyQuestCities } from "@workspace/db";
import { eq, and, or, sql } from "drizzle-orm";

const cityImageMap: Record<string, string> = {
  "Munich-Germany": "/attached_assets/stock_images/munich_germany_oktob_2d939a60.jpg",
  "Frankfurt-Germany": "/attached_assets/stock_images/frankfurt_germany_sk_47b0159c.jpg",
  "Manchester-United Kingdom": "/attached_assets/stock_images/manchester_england_c_e69d211f.jpg",
  "Edinburgh-United Kingdom": "/attached_assets/stock_images/edinburgh_scotland_c_43c5b256.jpg",
  "Marseille-France": "/attached_assets/stock_images/marseille_france_har_97f0b6db.jpg",
  "Lyon-France": "/attached_assets/stock_images/lyon_france_city_old_e8c0ac03.jpg",
  "Naples-Italy": "/attached_assets/stock_images/naples_italy_vesuviu_3ebd4e23.jpg",
  "Florence-Italy": "/attached_assets/stock_images/florence_italy_duomo_6970b549.jpg",
  "Porto-Portugal": "/attached_assets/stock_images/porto_portugal_color_6a808cfd.jpg",
  "Zurich-Switzerland": "/attached_assets/stock_images/zurich_switzerland_l_435127a5.jpg",
  "Stockholm-Sweden": "/attached_assets/stock_images/stockholm_sweden_isl_2d868b29.jpg",
  "Copenhagen-Denmark": "/attached_assets/stock_images/copenhagen_denmark_c_429ccf4f.jpg",
  "Oslo-Norway": "/attached_assets/stock_images/oslo_norway_fjord_ci_75970b14.jpg",
  "Dublin-Ireland": "/attached_assets/stock_images/dublin_ireland_city__5f8697d7.jpg",
  "Vienna-Austria": "/attached_assets/stock_images/vienna_austria_palac_2e2d184b.jpg",
  "Chicago-USA": "/attached_assets/stock_images/chicago_usa_skyline__3802abb3.jpg",
  "Houston-USA": "/attached_assets/stock_images/houston_texas_usa_sk_de5f83b9.jpg",
  "Seattle-USA": "/attached_assets/stock_images/seattle_usa_space_ne_fc4f4fea.jpg",
  "Philadelphia-USA": "/attached_assets/stock_images/philadelphia_usa_ind_1ab98de3.jpg",
  "Vancouver-Canada": "/attached_assets/stock_images/vancouver_canada_mou_b41477d2.jpg",
  "Montreal-Canada": "/attached_assets/stock_images/montreal_canada_city_8a39f290.jpg",
  "Toronto-Canada": "/attached_assets/stock_images/toronto_canada_cn_to_c5f873c6.jpg",
  "Guadalajara-Mexico": "/attached_assets/stock_images/guadalajara_mexico_c_707cacaf.jpg",
  "Monterrey-Mexico": "/attached_assets/stock_images/monterrey_mexico_mou_b787f6c5.jpg",
  "Panama City-Panama": "/attached_assets/stock_images/panama_city_panama_s_16362cb0.jpg",
  "Osaka-Japan": "/attached_assets/stock_images/osaka_japan_castle_c_cc5c7600.jpg",
  "Nagoya-Japan": "/attached_assets/stock_images/nagoya_japan_castle__04825558.jpg",
  "Busan-South Korea": "/attached_assets/stock_images/busan_south_korea_be_4031eabb.jpg",
  "Daegu-South Korea": "/attached_assets/stock_images/daegu_south_korea_ci_6d00e58e.jpg",
  "Karachi-Pakistan": "/attached_assets/stock_images/karachi_pakistan_cit_0141eaa8.jpg",
  "Lahore-Pakistan": "/attached_assets/stock_images/lahore_pakistan_bads_15505722.jpg",
  "Ahmedabad-India": "/attached_assets/stock_images/ahmedabad_india_saba_19a95cde.jpg",
  "Pune-India": "/attached_assets/stock_images/pune_india_city_skyl_0b86e1f9.jpg",
  "Chennai-India": "/attached_assets/stock_images/chennai_india_marina_1c05e132.jpg",
  "Hanoi-Vietnam": "/attached_assets/stock_images/hanoi_vietnam_old_qu_67fd584f.jpg",
  "Ho Chi Minh City-Vietnam": "/attached_assets/stock_images/ho_chi_minh_city_vie_83b987f9.jpg",
  "Bangkok-Thailand": "/attached_assets/stock_images/bangkok_thailand_tem_71399573.jpg",
  "Taipei-Taiwan": "/attached_assets/stock_images/taipei_taiwan_101_to_88d9539b.jpg",
  "Kaohsiung-Taiwan": "/attached_assets/stock_images/kaohsiung_taiwan_har_76c5efa8.jpg",
  "Dubai-UAE": "/attached_assets/stock_images/dubai_uae_burj_khali_de45eed0.jpg",
  "Abu Dhabi-UAE": "/attached_assets/stock_images/abu_dhabi_uae_sheikh_9abea471.jpg",
  "Doha-Qatar": "/attached_assets/stock_images/doha_qatar_skyline_m_193bc59b.jpg",
  "Almaty-Kazakhstan": "/attached_assets/stock_images/almaty_kazakhstan_mo_8535bc6c.jpg",
  "Santiago-Chile": "/attached_assets/stock_images/santiago_chile_andes_25af6b11.jpg",
  "Valparaíso-Chile": "/attached_assets/stock_images/valparaiso_chile_col_52a2e99d.jpg",
  "Medellín-Colombia": "/attached_assets/stock_images/medellin_colombia_ci_54e29d88.jpg",
  "Barranquilla-Colombia": "/attached_assets/stock_images/barranquilla_colombi_c2d32441.jpg",
  "Guayaquil-Ecuador": "/attached_assets/stock_images/guayaquil_ecuador_ig_4fe19a59.jpg",
  "Cusco-Peru": "/attached_assets/stock_images/cusco_peru_machu_pic_12ce479e.jpg",
  "Rosario-Argentina": "/attached_assets/stock_images/rosario_argentina_ri_426fff69.jpg",
  "Recife-Brazil": "/attached_assets/stock_images/recife_brazil_colorf_64aa87da.jpg",
  "Belém-Brazil": "/attached_assets/stock_images/belem_brazil_amazon__7e6e20db.jpg",
  "Casablanca-Morocco": "/attached_assets/stock_images/casablanca_morocco_h_6d841a70.jpg",
  "Marrakech-Morocco": "/attached_assets/stock_images/marrakech_morocco_me_377c703a.jpg",
  "Nairobi-Kenya": "/attached_assets/stock_images/nairobi_kenya_city_s_95948680.jpg",
  "Mombasa-Kenya": "/attached_assets/stock_images/mombasa_kenya_fort_j_18d1eee2.jpg",
  "Accra-Ghana": "/attached_assets/stock_images/accra_ghana_colorful_c605e83c.jpg",
  "Kigali-Rwanda": "/attached_assets/stock_images/kigali_rwanda_clean__97313d6c.jpg",
  "Durban-South Africa": "/attached_assets/stock_images/durban_south_africa__203aa06d.jpg",
  "Tunis-Tunisia": "/attached_assets/stock_images/tunis_tunisia_medina_0e7b14e6.jpg",
  "Lagos-Nigeria": "/attached_assets/stock_images/lagos_nigeria_city_s_ce6e639e.jpg",
  "Melbourne-Australia": "/attached_assets/stock_images/melbourne_australia__2edd902c.jpg",
  "Brisbane-Australia": "/attached_assets/stock_images/brisbane_australia_c_4a8e2e96.jpg",
  "Perth-Australia": "/attached_assets/stock_images/perth_australia_city_9f1e8bdb.jpg",
  "Adelaide-Australia": "/attached_assets/stock_images/adelaide_australia_c_8a144c50.jpg",
  "Auckland-New Zealand": "/attached_assets/stock_images/auckland_new_zealand_c4e3e10e.jpg",
  "Wellington-New Zealand": "/attached_assets/stock_images/wellington_new_zeala_4a8925cb.jpg",
  "Suva-Fiji": "/attached_assets/stock_images/suva_fiji_tropical_m_62d1eb0f.jpg",
};

export async function updateCityImages(): Promise<{ updated: number; failed: string[] }> {
  let updated = 0;
  const failed: string[] = [];

  const allCities = await db.select().from(dailyQuestCities);
  
  const citiesToUpdate: { city: string; country: string; imageUrl: string }[] = [];
  
  for (const [key, imageUrl] of Object.entries(cityImageMap)) {
    const [city, country] = key.split("-");
    const existing = allCities.find(c => c.city === city && c.country === country);
    
    if (existing && existing.imageUrl !== imageUrl) {
      citiesToUpdate.push({ city, country, imageUrl });
    }
  }
  
  if (citiesToUpdate.length === 0) {
    console.log(`✅ All city images are up to date (${allCities.length} cities)`);
    return { updated: 0, failed: [] };
  }
  
  console.log(`📷 Updating ${citiesToUpdate.length} city images...`);
  
  for (const { city, country, imageUrl } of citiesToUpdate) {
    try {
      const result = await db
        .update(dailyQuestCities)
        .set({ imageUrl })
        .where(and(
          eq(dailyQuestCities.city, city),
          eq(dailyQuestCities.country, country)
        ))
        .returning();
      
      if (result.length > 0) {
        updated++;
        console.log(`✅ Updated image for ${city}, ${country}`);
      }
    } catch (error) {
      failed.push(`${city}-${country}`);
      console.error(`❌ Error updating ${city}, ${country}:`, error);
    }
  }

  console.log(`\n📊 Summary: Updated ${updated} cities, ${failed.length} failed`);
  return { updated, failed };
}

