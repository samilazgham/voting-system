// متغيرات النظام
let authToken = null;
let currentVoters = [];
let currentCandidates = [];

// عرض الرسائل
function showMessage(text, type, element) {
    element.textContent = text;
    element.className = `message ${type}`;
    element.style.display = 'block';
    
    if (type !== 'info') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }
}

// تسجيل الدخول
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const message = document.getElementById('loginMessage');
    
    if (!username || !password) {
        showMessage('الرجاء إدخال جميع البيانات', 'error', message);
        return;
    }
    
    showMessage('جاري التحقق...', 'info', message);
    
    try {
        const response = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            loadStats();
            loadVoters();
            loadCandidates();
            showMessage('تم تسجيل الدخول بنجاح', 'success', message);
        } else {
            showMessage(data.message, 'error', message);
        }
    } catch (error) {
        showMessage('خطأ في الاتصال بالخادم', 'error', message);
    }
}

// تسجيل الخروج
function logout() {
    authToken = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('username').value = 'admin';
    document.getElementById('password').value = 'admin123';
}

// عرض التبويبات
function showTab(tabName) {
    // إخفاء جميع التبويبات
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // إزالة النشط من جميع الأزرار
    document.querySelectorAll('.tab').forEach(button => {
        button.classList.remove('active');
    });
    
    // إظهار التبويب المطلوب
    document.getElementById(`${tabName}Tab`).classList.add('active');
    event.target.classList.add('active');
    
    // تحميل البيانات إذا لزم الأمر
    if (tabName === 'voters') {
        loadVoters();
    } else if (tabName === 'candidates') {
        loadCandidates();
    } else if (tabName === 'results') {
        loadResults();
    }
}

// تحميل الإحصائيات
async function loadStats() {
    try {
        const response = await fetch('/api/admin/stats');
        const stats = await response.json();
        
        document.getElementById('totalVoters').textContent = stats.totalVoters;
        document.getElementById('voted').textContent = stats.voted;
        document.getElementById('totalCandidates').textContent = stats.candidates;
        document.getElementById('totalVotes').textContent = stats.totalVotes;
    } catch (error) {
        console.error('خطأ في تحميل الإحصائيات:', error);
    }
}

// تحميل الناخبين
async function loadVoters() {
    try {
        const response = await fetch('/api/admin/voters');
        currentVoters = await response.json();
        
        const tbody = document.getElementById('votersList');
        tbody.innerHTML = '';
        
        currentVoters.forEach((voter, index) => {
            const status = voter.has_voted 
                ? '<span style="color:green">✓ مصوت</span>' 
                : '<span style="color:red">✗ لم يصوت</span>';
            
            const date = new Date(voter.created_at).toLocaleDateString('ar-SA');
            
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${voter.national_id}</td>
                    <td>${voter.full_name}</td>
                    <td>${voter.email || "-"}</td>
                    <td>${voter.phone || "-"}</td>
                    <td>${status}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="deleteVoter(${voter.id})" style="padding:5px 10px;font-size:0.9rem; margin: 2px;">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-primary" onclick="editVoter(${voter.id})" style="padding:5px 10px;font-size:0.9rem; margin: 2px;">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                        <button class="btn btn-warning" onclick="resetVoter(${voter.id})" style="padding:5px 10px;font-size:0.9rem; margin: 2px; background: #ffc107; color: #000;">
                            <i class="fas fa-redo"></i> إعادة تعيين
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('خطأ في تحميل الناخبين:', error);
    }
}

// تحميل المرشحين
async function loadCandidates() {
    try {
        const response = await fetch('/api/admin/candidates');
        currentCandidates = await response.json();
        
        const tbody = document.getElementById('candidatesList');
        tbody.innerHTML = '';
        
        currentCandidates.forEach((candidate, index) => {
            const date = new Date(candidate.created_at).toLocaleDateString('ar-SA');
            
            tbody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td>${candidate.name}</td>
                    <td>${candidate.description || "-"}</td>
                    <td>${candidate.party || "مستقل"}</td>
                    <td>${candidate.votes}</td>
                    <td>${date}</td>
                    <td>
                        <button class="btn btn-secondary" onclick="deleteCandidate(${candidate.id})" style="padding:5px 10px;font-size:0.9rem; margin: 2px;">
                            <i class="fas fa-trash"></i> حذف
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-primary" onclick="editCandidate(${candidate.id})" style="padding:5px 10px;font-size:0.9rem; margin: 2px;">
                            <i class="fas fa-edit"></i> تعديل
                        </button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('خطأ في تحميل المرشحين:', error);
    }
}

// تحميل النتائج
async function loadResults() {
    try {
        const response = await fetch('/api/results');
        const results = await response.json();
        
        const container = document.getElementById('resultsContainer');
        container.innerHTML = '';
        
        if (results.length === 0) {
            container.innerHTML = '<p>لا توجد نتائج بعد</p>';
            return;
        }
        
        let html = '<div class="results-grid" style="display: grid; grid-template-columns: 1fr; gap: 15px;">';
        
        results.forEach((candidate, index) => {
            const percentage = candidate.percentage || 0;
            const width = Math.min(percentage, 100);
            
            html += `
                <div class="result-card" style="background: #fff; padding: 15px; border-radius: 10px; box-shadow: 0 3px 10px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #2c3e50;">${index + 1}. ${candidate.name}</h3>
                        <span style="font-weight: bold; color: #3498db;">${candidate.votes} صوت</span>
                    </div>
                    <div style="margin-bottom: 5px;">
                        <span style="color: #666;">${candidate.party || 'مستقل'}</span>
                    </div>
                    <div style="background: #f0f0f0; border-radius: 5px; height: 20px; overflow: hidden;">
                        <div style="background: linear-gradient(90deg, #3498db, #2ecc71); width: ${width}%; height: 100%; transition: width 1s;"></div>
                    </div>
                    <div style="text-align: left; margin-top: 5px; color: #666; font-size: 0.9rem;">
                        ${percentage}%
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    } catch (error) {
        console.error('خطأ في تحميل النتائج:', error);
    }
}

// إضافة ناخب جديد
async function addVoter() {
    const nationalId = document.getElementById('newNationalId').value;
    const fullName = document.getElementById('newFullName').value;
    const phone = document.getElementById('newPhone').value;
    const email = document.getElementById('newEmail').value;
    const message = document.getElementById('addVoterMessage');
    
    if (!nationalId || !fullName) {
        showMessage('الرجاء إدخال رقم الهوية والاسم', 'error', message);
        return;
    }
    
    showMessage('جاري إضافة الناخب...', 'info', message);
    
    try {
        const response = await fetch('/api/admin/add-voter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nationalId, fullName, phone, email })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success', message);
            // تفريغ الحقول
            document.getElementById('newNationalId').value = '';
            document.getElementById('newFullName').value = '';
            document.getElementById('newPhone').value = '';
            document.getElementById('newEmail').value = '';
            // تحديث البيانات
            setTimeout(() => {
                loadStats();
                loadVoters();
            }, 1000);
        } else {
            showMessage(data.message, 'error', message);
        }
    } catch (error) {
        showMessage('خطأ في الاتصال بالخادم', 'error', message);
    }
}

// إضافة مرشح جديد
async function addCandidate() {
    const name = document.getElementById('candidateName').value;
    const party = document.getElementById('candidateParty').value;
    const description = document.getElementById('candidateDescription').value;
    const message = document.getElementById('addCandidateMessage');
    
    if (!name) {
        showMessage('الرجاء إدخال اسم المرشح', 'error', message);
        return;
    }
    
    showMessage('جاري إضافة المرشح...', 'info', message);
    
    try {
        const response = await fetch('/api/admin/add-candidate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, party, description })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showMessage(data.message, 'success', message);
            // تفريغ الحقول
            document.getElementById('candidateName').value = '';
            document.getElementById('candidateParty').value = '';
            document.getElementById('candidateDescription').value = '';
            // تحديث البيانات
            setTimeout(() => {
                loadStats();
                loadCandidates();
            }, 1000);
        } else {
            showMessage(data.message, 'error', message);
        }
    } catch (error) {
        showMessage('خطأ في الاتصال بالخادم', 'error', message);
    }
}

// تعديل بيانات ناخب
async function editVoter(id) {
    const voter = currentVoters.find(v => v.id === id);
    
    if (!voter) {
        alert('الناخب غير موجود');
        return;
    }
    
    const newNationalId = prompt('رقم الهوية الجديد:', voter.national_id);
    if (newNationalId === null) return;
    
    const newFullName = prompt('الاسم الجديد:', voter.full_name);
    if (newFullName === null) return;
    
    const newPhone = prompt('رقم الهاتف الجديد:', voter.phone || '');
    const newEmail = prompt('البريد الإلكتروني الجديد:', voter.email || '');
    
    try {
        const response = await fetch(`/api/admin/update-voter/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nationalId: newNationalId,
                fullName: newFullName,
                phone: newPhone,
                email: newEmail
            })
        });
        
        const data = await response.json();
        alert(data.message);
        
        if (data.success) {
            loadVoters();
            loadStats();
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في التحديث');
    }
}

// تعديل بيانات مرشح
async function editCandidate(id) {
    const candidate = currentCandidates.find(c => c.id === id);
    
    if (!candidate) {
        alert('المرشح غير موجود');
        return;
    }
    
    const newName = prompt('اسم المرشح الجديد:', candidate.name);
    if (newName === null) return;
    
    const newDescription = prompt('الوصف الجديد:', candidate.description || '');
    const newParty = prompt('الحزب الجديد:', candidate.party || 'مستقل');
    
    try {
        const response = await fetch(`/api/admin/update-candidate/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: newName,
                description: newDescription,
                party: newParty
            })
        });
        
        const data = await response.json();
        alert(data.message);
        
        if (data.success) {
            loadCandidates();
            loadStats();
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في التحديث');
    }
}

// إعادة تعيين ناخب (إلغاء التصويت)
async function resetVoter(id) {
    if (!confirm('هل تريد إعادة تعيين هذا الناخب؟ سيتم إلغاء تصويته.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/reset-voter/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        alert(data.message);
        
        if (data.success) {
            loadVoters();
            loadCandidates();
            loadStats();
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في إعادة التعيين');
    }
}

// حذف ناخب
async function deleteVoter(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الناخب؟')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/voter/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        alert(data.message);
        
        if (data.success) {
            loadVoters();
            loadStats();
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في الحذف');
    }
}

// حذف مرشح
async function deleteCandidate(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المرشح؟')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/admin/candidate/${id}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        alert(data.message);
        
        if (data.success) {
            loadCandidates();
            loadStats();
        }
    } catch (error) {
        console.error('خطأ:', error);
        alert('حدث خطأ في الحذف');
    }
}

// تحميل البيانات عند فتح الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // لا شيء هنا - يجب تسجيل الدخول أولاً
});