// City centres for destination selection, not charging station locations.
const cities=[
['Shkup','Maqedonia e Veriut',41.9981,21.4254,'Skopje Скопје'],['Tetovë','Maqedonia e Veriut',42.0106,20.9716,'Tetovo Тетово'],['Gostivar','Maqedonia e Veriut',41.7959,20.9089,'Гостивар'],['Kumanovë','Maqedonia e Veriut',42.1322,21.7144,'Kumanovo Куманово'],['Ohër','Maqedonia e Veriut',41.1231,20.8016,'Ohrid Охрид'],['Strugë','Maqedonia e Veriut',41.1778,20.6783,'Struga Струга'],['Manastir','Maqedonia e Veriut',41.0297,21.3292,'Bitola Битола'],['Prilep','Maqedonia e Veriut',41.3444,21.5528,'Прилеп'],['Veles','Maqedonia e Veriut',41.7156,21.7756,'Велес'],['Gjevgjeli','Maqedonia e Veriut',41.1392,22.5025,'Gevgelija Гевгелија'],['Shtip','Maqedonia e Veriut',41.7458,22.1958,'Stip Штип'],['Strumicë','Maqedonia e Veriut',41.4378,22.6428,'Strumica Струмица'],['Kërçovë','Maqedonia e Veriut',41.5125,20.9589,'Kicevo Кичево'],['Dibër','Maqedonia e Veriut',41.5244,20.5242,'Debar Дебар'],
['Prishtinë','Kosovë',42.6629,21.1655,'Prishtina Pristina Приштина'],['Prizren','Kosovë',42.2139,20.7397,'Призрен'],['Pejë','Kosovë',42.6591,20.2883,'Peja Pec'],['Gjilan','Kosovë',42.4635,21.4694,'Gnjilane'],['Ferizaj','Kosovë',42.3702,21.1483,'Urosevac'],['Gjakovë','Kosovë',42.3803,20.4308,'Gjakova Djakovica'],['Mitrovicë','Kosovë',42.8914,20.8653,'Mitrovica'],
['Tiranë','Shqipëri',41.3275,19.8187,'Tirana Tirane'],['Durrës','Shqipëri',41.3231,19.4414,'Durres'],['Vlorë','Shqipëri',40.4667,19.4897,'Vlore Vlora'],['Shkodër','Shqipëri',42.0683,19.5126,'Shkoder Shkodra'],['Elbasan','Shqipëri',41.1125,20.0822,''],['Korçë','Shqipëri',40.6186,20.7808,'Korce Korca'],['Sarandë','Shqipëri',39.8756,20.0053,'Sarande Saranda'],
['Sofje','Bullgari',42.6977,23.3219,'Sofia София'],['Kyustendil','Bullgari',42.2839,22.6911,'Кюстендил'],['Blagoevgrad','Bullgari',42.0209,23.0943,'Благоевград'],['Plovdiv','Bullgari',42.1354,24.7453,'Пловдив'],['Varna','Bullgari',43.2141,27.9147,'Варна'],['Burgas','Bullgari',42.5048,27.4626,'Бургас'],['Ruse','Bullgari',43.8356,25.9657,'Русе'],
['Beograd','Serbi',44.7866,20.4489,'Belgrade Београд'],['Nish','Serbi',43.3209,21.8958,'Nis Niš Ниш'],['Vranje','Serbi',42.5514,21.9003,'Врање'],['Novi Sad','Serbi',45.2671,19.8335,'Нови Сад'],['Leskovac','Serbi',42.9981,21.9461,'Лесковац'],
['Podgoricë','Mal i Zi',42.4304,19.2594,'Podgorica Подгорица'],['Budva','Mal i Zi',42.2911,18.8403,'Будва'],['Kotor','Mal i Zi',42.4247,18.7712,'Котор'],['Bar','Mal i Zi',42.0931,19.1003,'Бар'],['Ulqin','Mal i Zi',41.9297,19.2244,'Ulcinj Улцињ'],
['Sarajevë','Bosnjë dhe Hercegovinë',43.8563,18.4131,'Sarajevo Сарајево'],['Mostar','Bosnjë dhe Hercegovinë',43.3438,17.8078,'Мостар'],['Banja Luka','Bosnjë dhe Hercegovinë',44.7722,17.191,'Бања Лука'],
['Zagreb','Kroaci',45.815,15.9819,''],['Split','Kroaci',43.5081,16.4402,''],['Dubrovnik','Kroaci',42.6507,18.0944,''],['Rijeka','Kroaci',45.3271,14.4422,''],['Zadar','Kroaci',44.1194,15.2314,''],['Ljubljanë','Slloveni',46.0569,14.5058,'Ljubljana'],['Maribor','Slloveni',46.5547,15.6459,''],
['Selanik','Greqi',40.6401,22.9444,'Thessaloniki Θεσσαλονίκη'],['Athinë','Greqi',37.9838,23.7275,'Athens Αθήνα'],['Kavala','Greqi',40.9397,24.4018,'Καβάλα'],['Janinë','Greqi',39.665,20.8537,'Ioannina Ιωάννινα'],
['Bukuresht','Rumani',44.4268,26.1025,'Bucharest Bucuresti București'],['Timisoara','Rumani',45.7489,21.2087,'Timișoara'],['Craiova','Rumani',44.3302,23.7949,''],['Cluj-Napoca','Rumani',46.7712,23.6236,'Cluj'],['Stamboll','Turqi',41.0082,28.9784,'Istanbul İstanbul'],['Edirne','Turqi',41.6771,26.5557,'']
];
const normalize=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
export function localPlaces(query){
 const q=normalize(query.split(',')[0]);if(q.length<3)return [];
 return cities.filter(([name,country,lat,lon,aliases])=>{
   const names=[name,...aliases.split(' '),aliases].map(normalize).filter(Boolean);
   return names.some(name=>name===q);
 }).map(([name,country,lat,lon])=>({label:`${name}, ${country}`,point:{lat,lon}}));
}
