// المتغيرات العامة
let currentStep = 1;
let currentVoter = null;
let selectedCandidate = null;
let candidates = [];

// الانتقال بين الخطوات
function goToStep(step) {
    // إخفاء جميع الخطوات
    document.querySelectorAll('.step').forEach(s => {
        s.classList.remove('active');
    });
    
    // إظهار الخطوة المطلوبة
    const stepElement = document.getElementById(`step${step}`);
    if (stepElement) {
        stepElement.classList.add('active');
        currentStep = step;
        
        // إجراءات خاصة بكل خطوة
        if (step === 2 && currentVoter) {
            document.getElementById('voterName').textContent = currentVoter.name;
            loadCandidates();
        } else if (step === 3 && selectedCandidate) {
            document.getElementById('selectedCandidateInfo').innerHTML = `
                <h3>${selectedCandidate.name}</h3>
                <p>${selectedCandidate.description || ''}</p>
                <p><strong>${selectedCandidate.party || 'مستقل'}</strong></p>
            `;
        } else if (step === 4 && currentVoter && selectedCandidate) {
            document.getElementById('finalVoterName').textContent = currentVoter.name;
            document.getElementById('finalNationalId').textContent = currentVoter.nationalId;
            document.getElementById('voteId').textContent = 'VOTE-' + Date.now().toString().slice(-6);
            document.getElementById('voteTime').textContent = new Date().toLocaleString('ar-SA');
            document.getElementById('finalCandidate').textContent = selectedCandidate.name;
        }
    }
}

// التحقق من هوية الناخب
async function verifyVoter() {
    const nationalId = document.getElementById('nationalId').value.trim();
    const messageDiv = document.getElementById('verifyMessage');
    
    // التحقق من الإدخال
    if (!nationalId) {
        showMessage('الرجاء إدخال رقم الهوية', 'error', messageDiv);
        return;
    }
    
    if (nationalId.length < 5) {
        showMessage('رقم الهوية يجب أن يكون 5 أرقام على الأقل', 'error', messageDiv);
        return;
    }
    
    // عرض رسالة الانتظار
    showMessage('جاري التحقق من الهوية...', 'info', messageDiv);
    
    try {
        console.log('📤 إرسال طلب التحقق لرقم:', nationalId);
        
        // إرسال طلب التحقق
        const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nationalId: nationalId })
        });
        
        console.log('📥 استجابة الخادم:', response.status);
        
        // التحقق من حالة الاستجابة
        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 بيانات الاستجابة:', data);
        
        // معالجة الرد
        if (data.success) {
            currentVoter = data.voter;
            showMessage(`✅ مرحباً ${data.voter.name}! يمكنك الآن اختيار المرشح`, 'success', messageDiv);
            
            // الانتقال للخطوة الثانية بعد ثانية ونصف
            setTimeout(() => {
                goToStep(2);
            }, 1500);
            
        } else {
            showMessage(`❌ ${data.message || 'خطأ في التحقق'}`, 'error', messageDiv);
        }
        
    } catch (error) {
        console.error('❌ خطأ في الاتصال:', error);
        showMessage('⚠️ حدث خطأ في الاتصال بالخادم. تأكد من تشغيل الخادم.', 'error', messageDiv);
    }
}

// تحميل قائمة المرشحين
async function loadCandidates() {
    const container = document.getElementById('candidatesList');
    const messageDiv = document.getElementById('candidatesMessage') || document.getElementById('verifyMessage');
    
    try {
        showMessage('جاري تحميل قائمة المرشحين...', 'info', messageDiv);
        
        const response = await fetch('/api/candidates');
        
        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status}`);
        }
        
        candidates = await response.json();
        container.innerHTML = '';
        
        // إذا لم يكن هناك مرشحين
        if (candidates.length === 0) {
            showMessage('لا توجد مرشحين مسجلين بعد', 'error', messageDiv);
            container.innerHTML = '<p style="text-align:center; color:#666; padding:20px;">لا توجد مرشحين متاحين حالياً</p>';
            return;
        }
        
        // إنشاء بطاقات المرشحين
        candidates.forEach(candidate => {
            const card = document.createElement('div');
            card.className = 'candidate-card';
            card.innerHTML = `
                <div class="candidate-photo">
                    <i class="fas fa-user-tie"></i>
                </div>
                <h3>${candidate.name}</h3>
                <p style="color:#666; min-height:40px;">${candidate.description || 'مرشح للانتخابات'}</p>
                <p class="party" style="background:#e3f2fd; color:#1976d2; padding:5px 10px; border-radius:20px; display:inline-block;">
                    ${candidate.party || 'مستقل'}
                </p>
                <p style="margin:10px 0; color:#2c3e50;">
                    <i class="fas fa-vote-yea"></i> ${candidate.votes} صوت
                </p>
                <button class="btn btn-primary" onclick="selectCandidate(${candidate.id})" style="margin-top:10px;">
                    <i class="fas fa-check"></i> اختر هذا المرشح
                </button>
            `;
            container.appendChild(card);
        });
        
        showMessage(`تم تحميل ${candidates.length} مرشح`, 'success', messageDiv);
        
    } catch (error) {
        console.error('❌ خطأ في تحميل المرشحين:', error);
        showMessage('حدث خطأ في تحميل قائمة المرشحين', 'error', messageDiv);
        container.innerHTML = '<p style="text-align:center; color:#721c24; padding:20px;">حدث خطأ في تحميل المرشحين</p>';
    }
}

// اختيار مرشح
function selectCandidate(candidateId) {
    // العثور على المرشح المختار
    selectedCandidate = candidates.find(c => c.id === candidateId);
    
    if (!selectedCandidate) {
        alert('خطأ: المرشح غير موجود');
        return;
    }
    
    // إزالة التحديد من جميع البطاقات
    document.querySelectorAll('.candidate-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // إضافة التحديد للبطاقة المختارة
    const selectedCard = event.target.closest('.candidate-card');
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // عرض رسالة تأكيد
    const messageDiv = document.getElementById('candidatesMessage') || document.getElementById('verifyMessage');
    showMessage(`تم اختيار المرشح: ${selectedCandidate.name}`, 'success', messageDiv);
    
    // الانتقال للخطوة الثالثة بعد ثانية
    setTimeout(() => {
        goToStep(3);
    }, 1000);
}

// إرسال التصويت
async function submitVote() {
    if (!currentVoter || !selectedCandidate) {
        alert('حدث خطأ في البيانات. الرجاء المحاولة مرة أخرى.');
        return;
    }
    
    const messageDiv = document.getElementById('confirmMessage') || document.getElementById('verifyMessage');
    
    // عرض رسالة الانتظار
    showMessage('جاري تسجيل تصويتك...', 'info', messageDiv);
    
    try {
        console.log('📤 إرسال طلب التصويت:', {
            voterId: currentVoter.id,
            candidateId: selectedCandidate.id
        });
        
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                voterId: currentVoter.id,
                candidateId: selectedCandidate.id,
                ip: 'client'
            })
        });
        
        console.log('📥 استجابة التصويت:', response.status);
        
        if (!response.ok) {
            throw new Error(`خطأ في الخادم: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('📊 نتيجة التصويت:', data);
        
        if (data.success) {
            showMessage('✅ تم تسجيل تصويتك بنجاح!', 'success', messageDiv);
            
            // الانتقال لصفحة النجاح بعد نصف ثانية
            setTimeout(() => {
                goToStep(4);
            }, 500);
            
        } else {
            showMessage(`❌ ${data.message || 'فشل في تسجيل التصويت'}`, 'error', messageDiv);
        }
        
    } catch (error) {
        console.error('❌ خطأ في التصويت:', error);
        showMessage('⚠️ حدث خطأ في الاتصال بالخادم', 'error', messageDiv);
    }
}

// عرض الرسائل
function showMessage(text, type, element) {
    if (!element) {
        // إذا لم يتم تحديد عنصر، استخدم العنصر الافتراضي
        element = document.getElementById('verifyMessage') || 
                  document.getElementById('confirmMessage') || 
                  document.getElementById('candidatesMessage');
        if (!element) return;
    }
    
    element.textContent = text;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    // إخفاء الرسالة بعد 5 ثوانٍ إذا لم تكن رسالة معلومات
    if (type !== 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// التهيئة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // تأكد من أننا في الخطوة الأولى
    goToStep(1);
    
    // السماح بالضغط على Enter في حقل الهوية
    document.getElementById('nationalId').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            verifyVoter();
        }
    });
    
    // تحميل المرشحين مسبقاً (اختياري)
    // loadCandidates();
});

// دالة اختبار سريعة للتحقق
function quickTest() {
    document.getElementById('nationalId').value = '1234567890';
    verifyVoter();
}