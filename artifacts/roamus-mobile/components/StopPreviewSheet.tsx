import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function StopPreviewSheet({ onClose, onConfirm, context = 'add' }: {
  onClose: () => void;
  onConfirm: () => void;
  context?: 'add' | 'replace' | 'swap';
}) {
  const btnLabel = context === 'add' ? 'Add to my day →' : 'Swap this stop →';
  const ctxLabel = context === 'add' ? 'Adding to Day 1' : 'Swapping for something better';

  return (
    <View style={s.sheet}>
      <View style={s.handle} />
      <View style={s.header}>
        <Text style={s.name}>United States Botanic Garden</Text>
        <TouchableOpacity style={s.close} onPress={onClose}>
          <Text style={s.closeX}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.heroImg} />
        <View style={s.pillRow}>
          <View style={s.typePill}><Text style={s.typePillTxt}>Landmark</Text></View>
          <View style={s.durPill}><Text style={s.durPillTxt}>⏱ 1–2 hours</Text></View>
          <View style={s.kidPill}><Text style={s.kidPillTxt}>✓ Kid-friendly</Text></View>
        </View>
        <View style={s.addrCard}>
          <Text style={s.addrWarn}>⚠ Estimated — please verify</Text>
          <Text style={s.addrText}>100 Maryland Ave SW, Washington, DC 20001</Text>
          <Text style={s.addrLink}>📍 Open in Maps to verify</Text>
        </View>
        <View style={s.loveCard}>
          <Text style={s.loveTitle}>⭐ WHY KIDS LOVE IT</Text>
          <Text style={s.loveTxt}>Kids are captivated by the towering tropical plants and the chance to walk through a real rainforest — indoors.</Text>
        </View>
        <View style={s.infoRow}>
          <View style={s.infoCell}><Text style={s.infoLabel}>ENTRY</Text><Text style={s.infoVal}>Free entry</Text></View>
          <View style={s.infoCell}><Text style={s.infoLabel}>BEST TIME</Text><Text style={s.infoVal}>Morning</Text></View>
        </View>
      </ScrollView>
      <View style={s.footer}>
        <Text style={s.ctxLabel}>{ctxLabel}</Text>
        <TouchableOpacity style={s.btn} onPress={onConfirm}>
          <Text style={s.btnTxt}>{btnLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  sheet:{ backgroundColor:'#F5F2EE', borderTopLeftRadius:24, borderTopRightRadius:24, maxHeight:'85%' },
  handle:{ width:32, height:3, backgroundColor:'#E0DDD8', borderRadius:2, alignSelf:'center', marginTop:10 },
  header:{ flexDirection:'row', alignItems:'flex-start', justifyContent:'space-between', padding:16, paddingBottom:0 },
  name:{ fontSize:19, fontWeight:'800', color:'#1A1F2E', flex:1, paddingRight:10, lineHeight:24 },
  close:{ width:28, height:28, borderRadius:14, backgroundColor:'#ECEAE6', alignItems:'center', justifyContent:'center' },
  closeX:{ fontSize:12, color:'#1A1F2E', fontWeight:'700' },
  body:{ paddingHorizontal:16 },
  heroImg:{ height:120, backgroundColor:'#3DAA6E', borderRadius:14, marginTop:12 },
  pillRow:{ flexDirection:'row', gap:7, flexWrap:'wrap', marginTop:11 },
  typePill:{ paddingHorizontal:11, paddingVertical:4, borderRadius:20, borderWidth:1.5, borderColor:'#E8692A' },
  typePillTxt:{ fontSize:11, fontWeight:'700', color:'#E8692A' },
  durPill:{ paddingHorizontal:11, paddingVertical:4, borderRadius:20, borderWidth:1.5, borderColor:'#E0DDD8' },
  durPillTxt:{ fontSize:11, fontWeight:'600', color:'#8A8FA8' },
  kidPill:{ paddingHorizontal:11, paddingVertical:4, borderRadius:20, backgroundColor:'rgba(61,170,110,0.1)' },
  kidPillTxt:{ fontSize:11, fontWeight:'700', color:'#3DAA6E' },
  addrCard:{ backgroundColor:'#fff', borderRadius:14, padding:12, marginTop:10 },
  addrWarn:{ fontSize:10, fontWeight:'700', color:'#F5A623', marginBottom:5 },
  addrText:{ fontSize:12, color:'#1A1F2E', fontWeight:'500', lineHeight:17 },
  addrLink:{ fontSize:11, color:'#E8692A', fontWeight:'700', marginTop:5 },
  loveCard:{ backgroundColor:'#fff', borderRadius:14, padding:12, marginTop:8 },
  loveTitle:{ fontSize:10, fontWeight:'800', color:'#1A1F2E', letterSpacing:0.5, marginBottom:6 },
  loveTxt:{ fontSize:12, color:'#4A5568', lineHeight:18, fontWeight:'500' },
  infoRow:{ flexDirection:'row', gap:8, marginTop:8, marginBottom:10 },
  infoCell:{ flex:1, backgroundColor:'#fff', borderRadius:14, padding:12 },
  infoLabel:{ fontSize:9, fontWeight:'800', color:'#8A8FA8', letterSpacing:0.8, marginBottom:3 },
  infoVal:{ fontSize:13, fontWeight:'700', color:'#1A1F2E' },
  footer:{ padding:14, paddingBottom:16, borderTopWidth:1, borderTopColor:'rgba(0,0,0,0.05)' },
  ctxLabel:{ fontSize:11, color:'#8A8FA8', fontWeight:'600', textAlign:'center', marginBottom:8 },
  btn:{ backgroundColor:'#E8692A', borderRadius:13, padding:14, alignItems:'center',
    shadowColor:'#E8692A', shadowOffset:{width:0,height:4}, shadowOpacity:0.28, shadowRadius:12 },
  btnTxt:{ color:'#fff', fontSize:14, fontWeight:'700' },
});
