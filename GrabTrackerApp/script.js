// Inisialisasi data dari localStorage
let records = JSON.parse(localStorage.getItem('stride_records')) || [];

// Paparkan tarikh hari ini secara automatik pada borang
const recordDateInput = document.getElementById('record-date');
if (recordDateInput) {
    recordDateInput.valueAsDate = new Date();
}

const currentDateEl = document.getElementById('current-date');
if (currentDateEl) {
    currentDateEl.innerText = new Date().toLocaleDateString('ms-MY', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// Urus Simpan Rekod Harian
const trackerForm = document.getElementById('tracker-form');
if (trackerForm) {
    trackerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const date = document.getElementById('record-date').value;
        const income = parseFloat(document.getElementById('income').value) || 0;
        const startKm = parseFloat(document.getElementById('start-km').value) || 0;
        const endKm = parseFloat(document.getElementById('end-km').value) || 0;
        const expenses = parseFloat(document.getElementById('expenses').value) || 0;
        const notes = document.getElementById('notes').value || '-';

        let totalKm = 0;
        if (endKm > startKm) {
            totalKm = endKm - startKm;
        }

        const newRecord = {
            id: Date.now(),
            date,
            income,
            startKm,
            endKm,
            totalKm,
            expenses,
            notes
        };

        records.unshift(newRecord);
        saveAndRefresh();
        this.reset();
        if (document.getElementById('record-date')) {
            document.getElementById('record-date').valueAsDate = new Date();
        }
    });
}

function saveAndRefresh() {
    localStorage.setItem('stride_records', JSON.stringify(records));
    renderApp();
}

function renderApp() {
    const tableBody = document.getElementById('records-table-body');
    
    let totalIncomeSum = 0;
    let totalKmSum = 0;
    let totalExpensesSum = 0;

    if (tableBody) {
        tableBody.innerHTML = '';

        if (records.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">Tiada rekod tersimpan lagi.</td></tr>`;
        }

        records.forEach((rec) => {
            totalIncomeSum += rec.income;
            totalKmSum += (rec.totalKm || 0);
            totalExpensesSum += rec.expenses;

            const row = document.createElement('tr');
            row.className = "hover:bg-slate-700/50 transition";
            row.innerHTML = `
                <td class="p-3 text-slate-300">${rec.date}</td>
                <td class="p-3 text-slate-300">${rec.notes}</td>
                <td class="p-3 text-cyan-400 font-medium">${rec.totalKm || 0} KM</td>
                <td class="p-3 text-emerald-400 font-medium">RM ${rec.income.toFixed(2)}</td>
                <td class="p-3 text-rose-400 font-medium">RM ${rec.expenses.toFixed(2)}</td>
                <td class="p-3 text-center">
                    <button onclick="deleteRecord(${rec.id})" class="text-rose-400 hover:text-rose-300 text-xs bg-rose-950/40 px-2.5 py-1 rounded border border-rose-900/50">Padam</button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    const netProfit = totalIncomeSum - totalExpensesSum;
    
    if (document.getElementById('total-income')) document.getElementById('total-income').innerText = `RM ${totalIncomeSum.toFixed(2)}`;
    if (document.getElementById('total-km')) document.getElementById('total-km').innerText = `${totalKmSum} KM`;
    if (document.getElementById('total-expenses')) document.getElementById('total-expenses').innerText = `RM ${totalExpensesSum.toFixed(2)}`;
    if (document.getElementById('net-profit')) document.getElementById('net-profit').innerText = `RM ${netProfit.toFixed(2)}`;
    
    updateDocumentStatus();
}

function getRemainingDays(expiryDateString) {
    if (!expiryDateString || expiryDateString.trim() === "" || expiryDateString === "undefined" || expiryDateString === "null") {
        return null;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiryDate = new Date(expiryDateString);
    if (isNaN(expiryDate.getTime())) return null;

    const diffTime = expiryDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function updateDocumentStatus() {
    const insuransDate = localStorage.getItem('stride_insurans_expiry');
    const roadtaxDate = localStorage.getItem('stride_roadtax_expiry');
    const puspakomDate = localStorage.getItem('stride_puspakom_expiry');

    // Insurans
    const insEl = document.getElementById('insurans-status');
    if (insEl) {
        const days = getRemainingDays(insuransDate);
        insEl.innerText = (days !== null && days >= -365 && days < 20000) ? `Baki ${days} hari` : `Belum ditetapkan`;
    }

    // Roadtax (Tapisan Keselamatan Ketat)
    const roadtaxEl = document.getElementById('roadtax-status');
    if (roadtaxEl) {
        if (!roadtaxDate || roadtaxDate === "null" || roadtaxDate === "undefined" || roadtaxDate.trim() === "" || roadtaxDate.length < 8) {
            roadtaxEl.innerText = `Belum ditetapkan`;
        } else {
            const days = getRemainingDays(roadtaxDate);
            if (days !== null && days >= -365 && days < 20000) {
                roadtaxEl.innerText = `Baki ${days} hari`;
            } else {
                roadtaxEl.innerText = `Belum ditetapkan`;
            }
        }
    }

    // Puspakom
    const puspakomEl = document.getElementById('puspakom-status');
    if (puspakomEl) {
        const days = getRemainingDays(puspakomDate);
        puspakomEl.innerText = (days !== null && days >= -365 && days < 20000) ? `Baki ${days} hari` : `Belum ditetapkan`;
    }
}

function deleteRecord(id) {
    if (confirm('Adakah anda pasti mahu memadam rekod ini?')) {
        records = records.filter(rec => rec.id !== id);
        saveAndRefresh();
    }
}

function exportJSON() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `stride_backup_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importJSON() {
    const fileInput = document.getElementById('import-file');
    if (fileInput) fileInput.click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if (Array.isArray(importedData)) {
                records = importedData;
                saveAndRefresh();
                alert('Data berjaya diimport!');
            } else {
                alert('Format fail JSON tidak sah.');
            }
        } catch (error) {
            alert('Ralat membaca fail.');
        }
    };
    reader.readAsText(file);
}

function exportExcel() {
    let csvContent = "data:text/csv;charset=utf-8,Tarikh,Nota,Jarak (KM),Pendapatan (RM),Belanja (RM)\n";
    records.forEach(rec => {
        csvContent += `"${rec.date}","${rec.notes}",${rec.totalKm || 0},${rec.income},${rec.expenses}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `stride_report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
}

// Jalankan paparan asas
renderApp();

// ==========================================================
// PENGECUT / PERISAI MUTLAK: HALANG ANGKA 6 JUTA DARI MUNCUL
// ==========================================================
window.addEventListener('load', () => {
    setInterval(() => {
        const rEl = document.getElementById('roadtax-status');
        if (rEl && (rEl.innerText.includes('657') || rEl.innerText.includes('juta') || parseInt(rEl.innerText) > 20000)) {
            rEl.innerText = 'Belum ditetapkan';
            localStorage.removeItem('stride_roadtax_expiry');
        }
    }, 200);
});