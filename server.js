const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// مسار ملف قاعدة البيانات
const DB_FILE = path.join(__dirname, 'database.json');

// تهيئة قاعدة البيانات
function initDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            voters: [
                { id: 1, national_id: '1234567890', full_name: 'أحمد محمد', email: 'ahmed@test.com', phone: '0512345678', has_voted: false, created_at: new Date().toISOString() },
                { id: 2, national_id: '0987654321', full_name: 'سارة علي', email: 'sara@test.com', phone: '0587654321', has_voted: false, created_at: new Date().toISOString() },
                { id: 3, national_id: '1111111111', full_name: 'محمد خالد', email: 'mohamed@test.com', phone: '0511111111', has_voted: false, created_at: new Date().toISOString() },
                { id: 4, national_id: '2222222222', full_name: 'فاطمة حسن', email: 'fatima@test.com', phone: '0522222222', has_voted: false, created_at: new Date().toISOString() }
            ],
            candidates: [
                { id: 1, name: 'مرشح ١', description: 'المرشح الأول للحزب الوطني', party: 'الحزب الوطني', photo: '', votes: 0, created_at: new Date().toISOString() },
                { id: 2, name: 'مرشح ٢', description: 'المرشح الثاني للحزب الديمقراطي', party: 'الحزب الديمقراطي', photo: '', votes: 0, created_at: new Date().toISOString() },
                { id: 3, name: 'مرشح ٣', description: 'مرشح مستقل عن الدائرة الثالثة', party: 'مستقل', photo: '', votes: 0, created_at: new Date().toISOString() }
            ],
            votes: [],
            admin: { username: 'admin', password: 'admin123' }
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('✅ تم إنشاء قاعدة البيانات الجديدة');
    }
}

// قراءة قاعدة البيانات
function readDB() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            initDatabase();
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('❌ خطأ في قراءة قاعدة البيانات:', error);
        initDatabase();
        return readDB();
    }
}

// كتابة قاعدة البيانات
function writeDB(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error('❌ خطأ في كتابة قاعدة البيانات:', error);
        return false;
    }
}

// تهيئة قاعدة البيانات عند البدء
initDatabase();

// ========== Routes ==========

// الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/vote.html'));
});

// لوحة الإدارة
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// التحقق من الناخب
app.post('/api/verify', (req, res) => {
    try {
        const { nationalId } = req.body;
        console.log('📞 طلب تحقق لرقم هوية:', nationalId);
        
        if (!nationalId) {
            return res.json({ success: false, message: 'لم يتم إدخال رقم الهوية' });
        }
        
        const db = readDB();
        const voter = db.voters.find(v => v.national_id === nationalId && !v.has_voted);
        
        if (voter) {
            console.log('✅ ناخب موجود:', voter.full_name);
            res.json({
                success: true,
                voter: {
                    id: voter.id,
                    name: voter.full_name,
                    nationalId: voter.national_id
                }
            });
        } else {
            const allVoter = db.voters.find(v => v.national_id === nationalId);
            if (allVoter && allVoter.has_voted) {
                console.log('⚠️ سبق التصويت:', nationalId);
                res.json({ success: false, message: 'سبق التصويت لهذه الهوية' });
            } else {
                console.log('❌ هوية غير مسجلة:', nationalId);
                res.json({ success: false, message: 'الهوية غير مسجلة في النظام' });
            }
        }
    } catch (error) {
        console.error('❌ خطأ في دالة التحقق:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// الحصول على المرشحين
app.get('/api/candidates', (req, res) => {
    try {
        const db = readDB();
        console.log('📋 إرسال قائمة المرشحين:', db.candidates.length, 'مرشح');
        res.json(db.candidates);
    } catch (error) {
        console.error('❌ خطأ في الحصول على المرشحين:', error);
        res.status(500).json({ error: 'خطأ في الخادم' });
    }
});

// التصويت
app.post('/api/vote', (req, res) => {
    try {
        const { voterId, candidateId } = req.body;
        console.log('🗳️ طلب تصويت:', { voterId, candidateId });
        
        if (!voterId || !candidateId) {
            return res.json({ success: false, message: 'بيانات ناقصة' });
        }
        
        const db = readDB();
        const voterIndex = db.voters.findIndex(v => v.id == voterId);
        const candidateIndex = db.candidates.findIndex(c => c.id == candidateId);
        
        if (voterIndex === -1 || candidateIndex === -1) {
            return res.json({ success: false, message: 'بيانات غير صحيحة' });
        }
        
        if (db.voters[voterIndex].has_voted) {
            return res.json({ success: false, message: 'سبق التصويت لهذا الناخب' });
        }
        
        // تحديث حالة الناخب
        db.voters[voterIndex].has_voted = true;
        
        // زيادة أصوات المرشح
        db.candidates[candidateIndex].votes += 1;
        
        // تسجيل التصويت
        const newVote = {
            id: db.votes.length + 1,
            voter_id: parseInt(voterId),
            candidate_id: parseInt(candidateId),
            voted_at: new Date().toISOString()
        };
        db.votes.push(newVote);
        
        if (writeDB(db)) {
            console.log('✅ تم التصويت بنجاح:', newVote.id);
            res.json({ 
                success: true, 
                message: 'تم التصويت بنجاح', 
                voteId: newVote.id 
            });
        } else {
            res.json({ success: false, message: 'فشل في حفظ التصويت' });
        }
    } catch (error) {
        console.error('❌ خطأ في التصويت:', error);
        res.status(500).json({ success: false, message: 'خطأ في الخادم' });
    }
});

// ========== API الإدارة ==========

// تسجيل دخول المدير
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    
    if (username === db.admin.username && password === db.admin.password) {
        res.json({ success: true, token: 'admin-token' });
    } else {
        res.json({ success: false, message: 'بيانات دخول خاطئة' });
    }
});

// إضافة ناخب
app.post('/api/admin/add-voter', (req, res) => {
    const { nationalId, fullName, phone, email } = req.body;
    const db = readDB();
    
    if (!nationalId || !fullName) {
        return res.json({ success: false, message: 'الرجاء إدخال رقم الهوية والاسم' });
    }
    
    const existingVoter = db.voters.find(v => v.national_id === nationalId);
    if (existingVoter) {
        return res.json({ success: false, message: 'رقم الهوية مسجل مسبقاً' });
    }
    
    const newVoter = {
        id: db.voters.length + 1,
        national_id: nationalId,
        full_name: fullName,
        email: email || '',
        phone: phone || '',
        has_voted: false,
        created_at: new Date().toISOString()
    };
    
    db.voters.push(newVoter);
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'تم إضافة الناخب بنجاح', voterId: newVoter.id });
    } else {
        res.json({ success: false, message: 'فشل في إضافة الناخب' });
    }
});

// إضافة مرشح
app.post('/api/admin/add-candidate', (req, res) => {
    const { name, description, party } = req.body;
    const db = readDB();
    
    if (!name) {
        return res.json({ success: false, message: 'الرجاء إدخال اسم المرشح' });
    }
    
    const newCandidate = {
        id: db.candidates.length + 1,
        name: name,
        description: description || '',
        party: party || 'مستقل',
        photo: '',
        votes: 0,
        created_at: new Date().toISOString()
    };
    
    db.candidates.push(newCandidate);
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'تم إضافة المرشح بنجاح', candidateId: newCandidate.id });
    } else {
        res.json({ success: false, message: 'فشل في إضافة المرشح' });
    }
});

// الحصول على الناخبين
app.get('/api/admin/voters', (req, res) => {
    const db = readDB();
    res.json(db.voters);
});

// الحصول على المرشحين
app.get('/api/admin/candidates', (req, res) => {
    const db = readDB();
    res.json(db.candidates);
});

// الإحصائيات
app.get('/api/admin/stats', (req, res) => {
    const db = readDB();
    
    const stats = {
        totalVoters: db.voters.length,
        voted: db.voters.filter(v => v.has_voted).length,
        candidates: db.candidates.length,
        totalVotes: db.votes.length,
        candidatesList: db.candidates
    };
    
    res.json(stats);
});

// النتائج
app.get('/api/results', (req, res) => {
    const db = readDB();
    
    const totalVotes = db.candidates.reduce((sum, c) => sum + c.votes, 0);
    
    const results = db.candidates.map(candidate => ({
        ...candidate,
        percentage: totalVotes > 0 ? ((candidate.votes / totalVotes) * 100).toFixed(2) : 0
    })).sort((a, b) => b.votes - a.votes);
    
    res.json(results);
});

// حذف ناخب
app.delete('/api/admin/voter/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    
    const voterIndex = db.voters.findIndex(v => v.id === id);
    
    if (voterIndex === -1) {
        return res.json({ success: false, message: 'الناخب غير موجود' });
    }
    
    db.voters.splice(voterIndex, 1);
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'تم حذف الناخب' });
    } else {
        res.json({ success: false, message: 'فشل في الحذف' });
    }
});

// حذف مرشح
app.delete('/api/admin/candidate/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    
    const candidateIndex = db.candidates.findIndex(c => c.id === id);
    
    if (candidateIndex === -1) {
        return res.json({ success: false, message: 'المرشح غير موجود' });
    }
    
    db.candidates.splice(candidateIndex, 1);
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'تم حذف المرشح' });
    } else {
        res.json({ success: false, message: 'فشل في الحذف' });
    }
});

// ========== تعديلات الإدارة ==========

// تحديث ناخب
app.put('/api/admin/update-voter/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { nationalId, fullName, phone, email } = req.body;
    const db = readDB();
    
    const voterIndex = db.voters.findIndex(v => v.id === id);
    
    if (voterIndex === -1) {
        return res.json({ success: false, message: 'الناخب غير موجود' });
    }
    
    // التحقق من عدم تكرار الهوية
    if (nationalId) {
        const duplicate = db.voters.find(v => v.national_id === nationalId && v.id !== id);
        if (duplicate) {
            return res.json({ success: false, message: 'رقم الهوية مسجل لناخب آخر' });
        }
        db.voters[voterIndex].national_id = nationalId;
    }
    
    if (fullName) db.voters[voterIndex].full_name = fullName;
    if (phone !== undefined) db.voters[voterIndex].phone = phone;
    if (email !== undefined) db.voters[voterIndex].email = email;
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'تم تحديث بيانات الناخب' });
    } else {
        res.json({ success: false, message: 'فشل في التحديث' });
    }
});

// تحديث مرشح
app.put('/api/admin/update-candidate/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const { name, description, party } = req.body;
    const db = readDB();
    
    const candidateIndex = db.candidates.findIndex(c => c.id === id);
    
    if (candidateIndex === -1) {
        return res.json({ success: false, message: 'المرشح غير موجود' });
    }
    
    // تحديث البيانات
    if (name) db.candidates[candidateIndex].name = name;
    if (description !== undefined) db.candidates[candidateIndex].description = description;
    if (party !== undefined) db.candidates[candidateIndex].party = party;
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'تم تحديث بيانات المرشح' });
    } else {
        res.json({ success: false, message: 'فشل في التحديث' });
    }
});

// إعادة تعيين ناخب (إلغاء التصويت)
app.put('/api/admin/reset-voter/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const db = readDB();
    
    const voterIndex = db.voters.findIndex(v => v.id === id);
    
    if (voterIndex === -1) {
        return res.json({ success: false, message: 'الناخب غير موجود' });
    }
    
    // إعادة تعيين التصويت
    db.voters[voterIndex].has_voted = false;
    
    // إزالة تصويت الناخب
    db.votes = db.votes.filter(vote => vote.voter_id !== id);
    
    // إعادة حساب الأصوات لكل مرشح
    db.candidates.forEach(candidate => {
        candidate.votes = db.votes.filter(vote => vote.candidate_id === candidate.id).length;
    });
    
    if (writeDB(db)) {
        res.json({ success: true, message: 'تم إعادة تعيين الناخب وإزالة تصويته' });
    } else {
        res.json({ success: false, message: 'فشل في إعادة التعيين' });
    }
});

// اختبار قاعدة البيانات
app.get('/api/test-db', (req, res) => {
    try {
        const db = readDB();
        res.json({
            success: true,
            votersCount: db.voters.length,
            candidatesCount: db.candidates.length,
            votesCount: db.votes.length,
            sampleVoter: db.voters[0],
            sampleCandidate: db.candidates[0]
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// اختبار API التحقق
app.post('/api/test-verify', (req, res) => {
    const { nationalId } = req.body;
    const db = readDB();
    
    const voter = db.voters.find(v => v.national_id === nationalId);
    
    res.json({
        nationalId,
        exists: !!voter,
        voter: voter,
        allVoters: db.voters.map(v => ({ id: v.id, national_id: v.national_id, name: v.full_name }))
    });
});

// صفحة الاختبار
app.get('/test', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>اختبار النظام</title>
            <style>
                body { font-family: Arial; padding: 20px; }
                button { padding: 10px 20px; margin: 5px; }
                #result { margin-top: 20px; padding: 15px; background: #f0f0f0; }
            </style>
        </head>
        <body>
            <h1>🧪 اختبار نظام التصويت</h1>
            
            <button onclick="testVerify()">اختبار التحقق (1234567890)</button>
            <button onclick="testCandidates()">اختبار المرشحين</button>
            <button onclick="testDB()">اختبار قاعدة البيانات</button>
            <button onclick="testVote()">اختبار التصويت</button>
            
            <div id="result"></div>
            
            <script>
                async function testVerify() {
                    const res = await fetch('/api/verify', {
                        method: 'POST',
                        headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({nationalId:'1234567890'})
                    });
                    const data = await res.json();
                    document.getElementById('result').innerHTML = 
                        '<h3>نتيجة التحقق:</h3>' + 
                        '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                }
                
                async function testCandidates() {
                    const res = await fetch('/api/candidates');
                    const data = await res.json();
                    document.getElementById('result').innerHTML = 
                        '<h3>المرشحين:</h3>' + 
                        '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                }
                
                async function testDB() {
                    const res = await fetch('/api/test-db');
                    const data = await res.json();
                    document.getElementById('result').innerHTML = 
                        '<h3>حالة قاعدة البيانات:</h3>' + 
                        '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
                }
                
                async function testVote() {
                    // أولاً التحقق
                    const verifyRes = await fetch('/api/verify', {
                        method: 'POST',
                        headers: {'Content-Type':'application/json'},
                        body: JSON.stringify({nationalId:'1234567890'})
                    });
                    const verifyData = await verifyRes.json();
                    
                    if (verifyData.success) {
                        // ثم التصويت
                        const voteRes = await fetch('/api/vote', {
                            method: 'POST',
                            headers: {'Content-Type':'application/json'},
                            body: JSON.stringify({
                                voterId: verifyData.voter.id,
                                candidateId: 1
                            })
                        });
                        const voteData = await voteRes.json();
                        document.getElementById('result').innerHTML = 
                            '<h3>نتيجة التصويت:</h3>' + 
                            '<pre>' + JSON.stringify(voteData, null, 2) + '</pre>';
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// أي رابط آخر يذهب لصفحة التصويت
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/vote.html'));
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log('🚀 ========== نظام التصويت الإلكتروني ==========');
    console.log(`✅ الخادم يعمل على: http://localhost:${PORT}`);
    console.log(`📊 واجهة التصويت: http://localhost:${PORT}`);
    console.log(`👨‍💼 لوحة الإدارة: http://localhost:${PORT}/admin`);
    console.log(`🧪 صفحة الاختبار: http://localhost:${PORT}/test`);
    console.log(`🔑 دخول الإدارة: admin / admin123`);
    console.log(`📋 الهويات التجريبية: 1234567890, 0987654321, 1111111111`);
    console.log('============================================');
    console.log('🛑 لإيقاف السيرفر: اضغط Ctrl+C');
    console.log('');
    console.log('📝 سجلات النظام:');
    console.log('- عند دخول ناخب: "طلب تحقق لرقم هوية:"');
    console.log('- عند التصويت: "طلب تصويت:"');
    console.log('- عند خطأ: "❌ خطأ في ..."');
    console.log('============================================');
});

// معالجة الأخطاء غير المتوقعة
process.on('uncaughtException', (error) => {
    console.error('❌ خطأ غير متوقع:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ وعد مرفوض غير معالج:', reason);
});