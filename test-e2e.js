const http = require('http');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

process.env.PORT = '3001';
const server = require('./server.js');

const BASE_URL = 'http://localhost:3001';

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
    console.log('🚀 Running Full E2E Test Suite for Rich Answer AI...\n');
    await wait(1000);

    // 1. Test /api/test
    console.log('1️⃣ Testing GET /api/test...');
    const testRes = await axios.get(`${BASE_URL}/api/test`);
    if (!testRes.data.success) throw new Error('Test endpoint failed');
    console.log('   ✅ GET /api/test PASSED:', testRes.data.message);

    // 2. Test /api/status
    console.log('\n2️⃣ Testing GET /api/status before upload...');
    const statusRes1 = await axios.get(`${BASE_URL}/api/status`);
    if (statusRes1.data.uploaded !== false) throw new Error('Status should not be uploaded initially');
    console.log('   ✅ Initial status verified: uploaded=false');

    // 3. Test /api/upload
    console.log('\n3️⃣ Testing POST /api/upload with sample PDF...');
    const pdfPath = path.join(__dirname, 'uploads', 'sample_manual.pdf');
    const form = new FormData();
    form.append('pdf', fs.createReadStream(pdfPath));

    const uploadRes = await axios.post(`${BASE_URL}/api/upload`, form, {
        headers: form.getHeaders()
    });
    console.log('   Upload response:', uploadRes.data);
    if (!uploadRes.data.success || uploadRes.data.totalPages !== 2) {
        throw new Error('Upload failed or page count mismatch');
    }
    console.log('   ✅ POST /api/upload PASSED: 2 pages indexed, chunks created');

    // 4. Test /api/ask
    console.log('\n4️⃣ Testing POST /api/ask with question...');
    const askRes = await axios.post(`${BASE_URL}/api/ask`, {
        question: 'What is the required bolt torque?'
    });
    console.log('   Ask response answer:\n', askRes.data.answer);
    console.log('   Source Pages:', askRes.data.sourcePages);
    if (!askRes.data.success || !askRes.data.sourcePages.includes(2)) {
        throw new Error('Ask failed to identify source page 2 for torque');
    }
    console.log('   ✅ POST /api/ask PASSED: Identified Page 2 with bolt torque!');

    // 5. Test /api/page/:pageNum (Visual Schematics Renderer)
    console.log('\n5️⃣ Testing GET /api/page/2 (Visual Schematic rendering)...');
    const pageImageRes = await axios.get(`${BASE_URL}/api/page/2`, {
        responseType: 'arraybuffer'
    });
    if (pageImageRes.headers['content-type'] !== 'image/png' || pageImageRes.data.length < 1000) {
        throw new Error('Page image rendering failed');
    }
    console.log(`   ✅ GET /api/page/2 PASSED: Rendered high-res PNG (${pageImageRes.data.length} bytes)`);

    // 6. Test /api/page-text/:pageNum
    console.log('\n6️⃣ Testing GET /api/page-text/2...');
    const pageTextRes = await axios.get(`${BASE_URL}/api/page-text/2`);
    if (!pageTextRes.data.success || !pageTextRes.data.text.includes('Torque')) {
        throw new Error('Page text retrieval failed');
    }
    console.log('   ✅ GET /api/page-text/2 PASSED: Retrieved text successfully');

    // 7. Test /api/reset
    console.log('\n7️⃣ Testing DELETE /api/reset...');
    const resetRes = await axios.delete(`${BASE_URL}/api/reset`);
    if (!resetRes.data.success) throw new Error('Reset failed');
    console.log('   ✅ DELETE /api/reset PASSED: State cleared cleanly');

    console.log('\n🎉 ALL 7 E2E TESTS PASSED SUCCESSFULLY! 🚀');
    process.exit(0);
}

runTests().catch(err => {
    console.error('\n❌ E2E Test FAILED:', err.message);
    if (err.response) {
        console.error('Server response data:', err.response.data);
    }
    process.exit(1);
});

