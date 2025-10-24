/**
 * Test para verificar que el sistema detecta referencias a medicamentos
 * mencionados previamente usando pronombres como "ese"
 */

import { AdvancedIntentAnalyzer } from '../utils/intentAnalysis.ts';

async function testPronounReference() {
  console.log('\n🧪 TEST: Detección de Referencias con Pronombres\n');
  console.log('='.repeat(60));
  
  const analyzer = new AdvancedIntentAnalyzer();
  
  // Simular historial de conversación
  const conversationHistory = [
    { role: 'user', content: 'Hola Julie' },
    { role: 'assistant', content: '¡Hola! ¿En qué puedo ayudarte?' },
    { role: 'user', content: 'Necesito información sobre el paracetamol' },
    { 
      role: 'assistant', 
      content: 'El paracetamol es un analgésico y antipirético muy común. Se usa para aliviar dolores leves a moderados y reducir la fiebre. La dosis habitual para adultos es de 500-1000mg cada 4-6 horas, sin exceder 4g al día. Es importante no combinarlo con alcohol y consultar a tu médico si tienes problemas hepáticos.' 
    },
  ];
  
  // Ahora el usuario hace referencia a "ese medicamento"
  const userMessage = 'me recetaron ese medicamento';
  
  console.log('\n📋 Historial de conversación:');
  conversationHistory.forEach((msg, i) => {
    const preview = msg.content.substring(0, 60) + (msg.content.length > 60 ? '...' : '');
    console.log(`  ${i + 1}. [${msg.role}]: ${preview}`);
  });
  
  console.log(`\n💬 Mensaje actual del usuario: "${userMessage}"`);
  console.log('\n🔍 Analizando...\n');
  
  try {
    const analysis = await analyzer.analyzeMessage(userMessage, conversationHistory);
    
    console.log('✅ Resultado del análisis:');
    console.log('─'.repeat(60));
    console.log(`  Intent: ${analysis.intent}`);
    console.log(`  Acción de medicamento: ${analysis.medicationAction?.action || 'ninguna'}`);
    console.log(`  Nombre detectado: ${analysis.medicationAction?.medicationName || 'NO DETECTADO'}`);
    console.log(`  Dosificación: ${analysis.medicationAction?.dosage || 'no especificada'}`);
    
    // Verificar si el test pasó
    if (analysis.medicationAction?.medicationName === 'Paracetamol') {
      console.log('\n✅ TEST PASADO: Se detectó correctamente "Paracetamol" del historial');
      return true;
    } else {
      console.log('\n❌ TEST FALLIDO: Se esperaba "Paracetamol" pero se obtuvo:', analysis.medicationAction?.medicationName);
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error);
    return false;
  }
}

async function testMultipleMedications() {
  console.log('\n\n🧪 TEST 2: Múltiples Medicamentos en Historial\n');
  console.log('='.repeat(60));
  
  const analyzer = new AdvancedIntentAnalyzer();
  
  const conversationHistory = [
    { role: 'user', content: 'Tomo ibuprofeno por las mañanas' },
    { role: 'assistant', content: 'Entendido, tomas ibuprofeno por las mañanas' },
    { role: 'user', content: '¿El paracetamol es bueno para el dolor de cabeza?' },
    { role: 'assistant', content: 'Sí, el paracetamol es efectivo para el dolor de cabeza. Dosis recomendada: 500-1000mg cada 4-6 horas.' },
  ];
  
  const userMessage = 'necesito registrar ese medicamento';
  
  console.log('\n📋 Historial con múltiples medicamentos:');
  conversationHistory.forEach((msg, i) => {
    console.log(`  ${i + 1}. [${msg.role}]: ${msg.content.substring(0, 60)}...`);
  });
  
  console.log(`\n💬 Mensaje: "${userMessage}"`);
  console.log('\n🔍 Analizando...\n');
  
  try {
    const analysis = await analyzer.analyzeMessage(userMessage, conversationHistory);
    
    console.log('✅ Resultado:');
    console.log('─'.repeat(60));
    console.log(`  Medicamento detectado: ${analysis.medicationAction?.medicationName || 'NO DETECTADO'}`);
    console.log(`  (Debería ser "Paracetamol", el más reciente mencionado)`);
    
    if (analysis.medicationAction?.medicationName === 'Paracetamol') {
      console.log('\n✅ TEST PASADO: Detectó el medicamento más reciente');
      return true;
    } else {
      console.log('\n⚠️ TEST PARCIAL: Detectó:', analysis.medicationAction?.medicationName);
      console.log('   (Se esperaba el más reciente: Paracetamol)');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Error en el test:', error);
    return false;
  }
}

async function testDirectMention() {
  console.log('\n\n🧪 TEST 3: Mención Directa (Sin Pronombre)\n');
  console.log('='.repeat(60));
  
  const analyzer = new AdvancedIntentAnalyzer();
  
  const testCases = [
    { message: 'me recetaron aspirina de 500mg', expected: 'Aspirina' },
    { message: 'necesito información sobre el paracetamol', expected: 'Paracetamol' },
    { message: 'tomé mi ibuprofeno', expected: 'Ibuprofeno' },
    { message: 'debo tomar losartan', expected: 'Losartan' },
    { message: 'me dieron omeprazol para la gastritis', expected: 'Omeprazol' },
  ];
  
  let passed = 0;
  
  for (const test of testCases) {
    console.log(`\n💬 Mensaje: "${test.message}"`);
    console.log('🔍 Analizando...');
    
    try {
      const analysis = await analyzer.analyzeMessage(test.message, []);
      
      console.log(`  Medicamento: ${analysis.medicationAction?.medicationName || 'NO DETECTADO'}`);
      console.log(`  Esperado: ${test.expected}`);
      
      if (analysis.medicationAction?.medicationName === test.expected) {
        console.log('  ✅ PASADO');
        passed++;
      } else {
        console.log('  ❌ FALLADO');
      }
    } catch (error) {
      console.error('  ❌ Error:', error);
    }
  }
  
  console.log(`\n📊 Resultados: ${passed}/${testCases.length} tests pasados`);
  return passed === testCases.length;
}

// Ejecutar todos los tests
async function runAllTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + '  TEST SUITE: Detección de Medicamentos con Referencias  '.padEnd(58) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  
  const results = [];
  
  results.push(await testPronounReference());
  results.push(await testMultipleMedications());
  results.push(await testDirectMention());
  
  // Resumen final
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 RESUMEN DE TESTS');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n  Tests pasados: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('\n  ✅ TODOS LOS TESTS PASARON\n');
  } else {
    console.log('\n  ⚠️ ALGUNOS TESTS FALLARON\n');
  }
  
  console.log('='.repeat(60) + '\n');
}

// Ejecutar
runAllTests().catch(console.error);
