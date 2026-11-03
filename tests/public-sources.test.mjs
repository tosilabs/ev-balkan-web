import test from 'node:test';
import assert from 'node:assert/strict';
import {myfahLocations,finesLocations,zagrebLocations,ocmLocations,mergeLocations} from '../scripts/source-adapters.mjs';
import {parseStations,settings,point,validStationId} from '../dist/core.mjs';
import {availabilitySummary} from '../dist/sources-ui.mjs';
const stamp='2026-11-02T14:00:00Z';
const greek={Locations:[{country_code:'GR',party_id:'ABC',id:'GR-ABC-S1-L',publish:true,name:'Official Greek location',address:'Main Street',city:'Thessaloniki',coordinates:{latitude:'40.64',longitude:'22.94'},operator:{name:'Test network'},evses:[{evse_id:'GR*ABC*E1',connectors:[{standard:'IEC_62196_T2_COMBO',power_type:'DC',max_electric_power:150000},{standard:'IEC_62196_T2',power_type:'AC_3_PHASE',max_electric_power:22000}]}]}]};
test('Official Greek OCPI watts become kW and typed connectors retain provenance',()=>{
 const e=myfahLocations(greek,stamp);assert.equal(e.length,1);assert.equal(e[0].connections[0].power,150);assert.equal(e[0].connections[1].power,22);
 const rows=parseStations({elements:e},settings({connector:'all',includeUnknown:true}),point(40.64,22.94));
 assert.equal(rows[0].speed.key,'ultra');assert.match(rows[0].sourceName,/MYFAH/);assert.ok(validStationId(rows[0].id));
});
test('Unknown OCPI power is never inferred from voltage times amperage',()=>{
 const input=structuredClone(greek);delete input.Locations[0].evses[0].connectors[0].max_electric_power;
 input.Locations[0].evses[0].connectors[0].max_voltage=1000;input.Locations[0].evses[0].connectors[0].max_amperage=500;
 assert.equal(myfahLocations(input,stamp)[0].connections[0].power,0);
});
test('Fines uses per-connector power and only explicit EUR/kWh tariffs',()=>{
 const data={features:[{id:7,geometry:{coordinates:[23.3,42.7]},properties:{name:'Fines test',connectors:{'CCS Combo 2 Plug (Cable Attached)':1,'Type 2':1},max_power_kw:300,price_range:{min:.4,max:.6,currency:'EUR',unit:'kWh'}}}]};
 const live={locations:[{location_id:7,connectors:[{plug_type:'CCS Combo 2 Plug (Cable Attached)',max_power_kw:150},{plug_type:'Type 2',max_power_kw:22}]}]};
 const e=finesLocations(data,live,stamp)[0];assert.equal(e.connections[1].power,22);assert.equal(e.finesId,'7');assert.match(e.tags.charge,/0.40–0.60 EUR\/kWh/);
 const without=finesLocations(data,null,stamp)[0];assert.ok(without.connections.every(c=>c.power===0),'Mixed connector power must not copy site maximum');
 data.features[0].properties.price_range.currency='BGN';assert.equal(finesLocations(data,live,stamp)[0].tags.charge,'');
});
test('Zagreb AC-only records do not invent Type 2 or a power value',()=>{
 const e=zagrebLocations({features:[{geometry:{coordinates:[15.98,45.81]},properties:{OBJECTID_1:1,NAZIV:'Town charger',ADRESA:'Street 1',BROJ_UTICNICA:2,TIP_UTICNICE:'AC'}}]},stamp);
 assert.equal(e[0].connections.length,0);
 const row=parseStations({elements:e},settings({connector:'all',includeUnknown:true}),point(45.81,15.98))[0];assert.equal(row.power,0);assert.equal(row.speed.key,'unknown');assert.match(row.sourceName,/Zagreb/);
});
test('Nearby different operators remain separate while the same operator is enriched',()=>{
 const osm={type:'node',id:1,lat:40.64,lon:22.94,tags:{name:'Original',operator:'Test network','socket:type2':'1','socket:type2:output':'22 kW'}};
 const incoming=myfahLocations(greek,stamp);
 let result=mergeLocations([structuredClone(osm)],incoming);assert.equal(result.elements.length,1);assert.equal(result.merged,1);assert.equal(result.elements[0].provenance.length,2);
 const other=structuredClone(incoming);other[0].tags.operator='Different operator';result=mergeLocations([structuredClone(osm)],other);assert.equal(result.elements.length,2);
 const sameFeed=[...incoming,{...structuredClone(incoming[0]),id:'another-official-location'}];assert.equal(mergeLocations([],sameFeed).elements.length,2,'Distinct records in the same official registry must stay distinct');
});
test('Old or malformed live data cannot be presented as current availability',()=>{
 const data={generated_at:stamp,connectors:[{available:true},{available:false},{status:'Available'}]};
 assert.equal(availabilitySummary(data,Date.parse(stamp)+60000).fresh,true);assert.equal(availabilitySummary(data,Date.parse(stamp)+60000).available,1);
 assert.equal(availabilitySummary(data,Date.parse(stamp)+660000).fresh,false);assert.equal(availabilitySummary({...data,generated_at:'bad'}).fresh,false);
});

test('OCM imports only approved contributor records with explicit open license and preserves useful metadata',()=>{
 const reference={DataProviders:[{ID:1,IsOpenDataLicensed:true,License:'CC BY 4.0'}],Operators:[{ID:1,Title:'EVN Macedonia',WebsiteURL:'https://emobility.evn.mk/'}],Countries:[{ID:134,ISOCode:'MK'}],UsageTypes:[{ID:4,Title:'Public - Membership Required',IsMembershipRequired:true}],StatusTypes:[{ID:50,Title:'Operational'}]};
 const row={ID:123,DataProviderID:1,OperatorID:1,SubmissionStatusTypeID:200,UsageTypeID:4,StatusTypeID:50,DateLastStatusUpdate:'2020-01-01',AddressInfo:{Title:'Test OCM',Latitude:42,Longitude:21,CountryID:134,AccessComments:'Entrance on east side'},Connections:[{ConnectionTypeID:33,PowerKW:150,CurrentTypeID:30,Quantity:2,Voltage:400,Amps:300}]};
 const result=ocmLocations({records:[row,{...row,ID:124,DataProviderID:2},{...row,ID:125,StatusTypeID:200},{...row,ID:126,UsageTypeID:6}],reference},stamp);
 assert.equal(result.length,1);assert.equal(result[0].connections[0].label,'CCS2');assert.equal(result[0].connections[0].voltage,400);assert.equal(result[0].metadata.accessNotes,'Entrance on east side');
 const parsed=parseStations({elements:result},settings({connector:'all'}),point(42,21))[0];assert.equal(parsed.id,'ocm/123');assert.match(parsed.source,/details\/123/);assert.equal(parsed.finesId,'');assert.equal(parsed.info.metadata.registryStatus,'Operational');assert.equal(parsed.allConnections[0].amps,300);
 assert.throws(()=>ocmLocations({records:[row],reference:{DataProviders:[{ID:1,IsOpenDataLicensed:false}]}},stamp));
});

test('Published imported OCM records retain the provider license, excluding NC and unlicensed providers',()=>{
 const reference={DataProviders:[{ID:1,IsOpenDataLicensed:true,License:'CC BY 4.0'},{ID:37,Title:'Voltrelli',IsOpenDataLicensed:true,License:'CC0'},{ID:26,IsOpenDataLicensed:true,License:'CC BY-NC-SA 3.0'},{ID:99,IsOpenDataLicensed:false,License:'All rights reserved'}]};
 const record={ID:123,DataProviderID:37,SubmissionStatusTypeID:100,UsageTypeID:1,StatusTypeID:50,AddressInfo:{Latitude:42,Longitude:21},Connections:[]};
 const rows=ocmLocations({reference,records:[record,{...record,ID:124,DataProviderID:26},{...record,ID:125,DataProviderID:99},{...record,ID:126,SubmissionStatusTypeID:50}]},stamp);
 assert.equal(rows.length,1);assert.equal(rows[0].provenance[0].license,'CC0');assert.equal(rows[0].provenance[0].name,'Voltrelli');
});
