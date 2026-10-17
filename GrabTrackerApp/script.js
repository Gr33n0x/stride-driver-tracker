const todayStr = new Date().toISOString().split('T')[0];
const currentMonthStr = todayStr.substring(0, 7);

document.getElementById('inputDate').valueAsDate = new Date();
document.getElementById('monthFilter').value = currentMonthStr;

// Data Jenama & Model Kereta Malaysia
const malaysiaCarDatabase = {
    "Perodua": ["Bezza", "Myvi", "Axia", "Ativa", "Alza", "Aruz", "Viva", "Kancil", "Kelisa"],
    "Proton": ["Saga", "Persona", "X50", "X70", "X90", "Iriz", "Exora", "Wira", "Waja"],
    "Honda": ["City", "Civic", "HR-V", "CR-V", "Jazz", "BR-V", "Accord"],
    "Toyota": ["Vios", "Yaris", "Corolla Cross", "Hilux", "Corolla Altis", "Camry", "Avanza"],
    "Nissan": ["Almera", "Serena", "Navara", "X-Trail", "Grand Livina"],
    "Mazda": ["Mazda 2", "Mazda 3", "CX-30", "CX-5"],
    "Hyundai": ["Elantra", "Tucson", "Staria", "Ioniq 5"],
    "Kia": ["Cerato", "Sportage", "Carnival"],
    "Lain-Lain": ["Model Lain"]
};

// Multi-Vehicle & App State
let vehicles = JSON.parse(localStorage.getItem('stride_vehicles')) || [
    { 
        id: 'v1', 
        name: 'Perodua Bezza (1.3L)', 
        insuranceDate: '', 
        roadtaxDate: '', 
        inspectionDate: '' 
    }
];
let activeVehicleId = localStorage.getItem('stride_active_vehicle') || vehicles[0].id;

let records = JSON.parse(localStorage.getItem('stride_records')) || [];
let dailyTarget = parseFloat(localStorage.getItem('stride_target')) || 200.00;
let monthlyKmTarget = parseFloat(localStorage.getItem('stride_km_target')) || 2000.00;

let baseOdometers = JSON.parse(localStorage.getItem('stride_base_odometers')) || { [vehicles[0].id]: 0 };
let lastServiceOdometers = JSON.parse(localStorage.getItem('stride_last_service_odos')) || { [vehicles[0].id]: 0 };
let serviceLogs = JSON.parse(localStorage.getItem('stride_service_logs')) || [];

let performanceChartInstance = null;
const form = document.getElementById('trackerForm');

// Initialize Vehicle Dropdown Header
function initVehicleDropdown() {
    const select = document.getElementById('vehicleSelect');
    select.innerHTML = '';
    vehicles.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v.id;
        opt.innerText = v.name;
        if (v.id === activeVehicleId) opt.selected = true;
        select.appendChild(opt);
    });
}

function changeActiveVehicle() {
    activeVehicleId = document.getElementById('vehicleSelect').value;
    localStorage.setItem('stride_active_vehicle', activeVehicleId);
    updateUI();
}

// Modal Pengurusan Kenderaan
function openVehicleModal() {
    initBrandDropdown();
    const currentVeh = vehicles.find(v => v.id === activeVehicleId);
    if (currentVeh) {
        document.getElementById('vehicleInsuranceInput').value = currentVeh.insuranceDate || '';
        document.getElementById('vehicleRoadtaxInput').value = currentVeh.roadtaxDate || '';
        document.getElementById('vehicleInspectionInput').value = currentVeh.inspectionDate || '';
        document.getElementById('vehicleBaseOdoInput').value = baseOdometers[activeVehicleId] || 0;
    }
    document.getElementById('vehicleModal').classList.remove('hidden');
}

function closeVehicleModal() {
    document.getElementById('vehicleModal').classList.add('hidden');
}

function initBrandDropdown() {
    const brandSelect = document.getElementById('vehicleBrandInput');
    brandSelect.innerHTML = '';
    Object.keys(malaysiaCarDatabase).forEach(brand => {
        const opt = document.createElement('option');
        opt.value = brand;
        opt.innerText = brand;
        brandSelect.appendChild(opt);
    });
    updateModelDropdown();
}

function updateModelDropdown() {
    const brand = document.getElementById('vehicleBrandInput').value;
    const modelSelect = document.getElementById('vehicleModelInput');
    modelSelect.innerHTML = '';
    
    const models = malaysiaCarDatabase[brand] || ["Lain-lain"];
    models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m;
        opt.innerText = m;
        modelSelect.appendChild(opt);
    });
}

function handleAddVehicle(e) {
    e.preventDefault();
    const brand = document.getElementById('vehicleBrandInput').value;
    const model = document.getElementById('vehicleModelInput').value;
    const cc = document.getElementById('vehicleCcInput').value;
    const baseOdo = parseFloat(document.getElementById('vehicleBaseOdoInput').value) || 0;
    const insuranceDate = document.getElementById('vehicleInsuranceInput').value;
    const roadtaxDate = document.getElementById('vehicleRoadtaxInput').value;
    const inspectionDate = document.getElementById('vehicleInspectionInput').value;

    const vName = `${brand} ${model} (${cc})`;
    const existingIndex = vehicles.findIndex(v => v.id === activeVehicleId);

    if (existingIndex !== -1 && vehicles.length === 1) {
        vehicles[existingIndex].name = vName;
        vehicles[existingIndex].insuranceDate = insuranceDate;
        vehicles[existingIndex].roadtaxDate = roadtaxDate;
        vehicles[existingIndex].inspectionDate = inspectionDate;
        baseOdometers[activeVehicleId] = baseOdo;
    } else {
        const newId = 'v_' + Date.now();
        vehicles.push({ 
            id: newId, 
            name: vName, 
            insuranceDate, 
            roadtaxDate, 
            inspectionDate 
        });
        baseOdometers[newId] = baseOdo;
        lastServiceOdometers[newId] = baseOdo;
        activeVehicleId = newId;
        localStorage.setItem('stride_active_vehicle', activeVehicleId);
    }

    localStorage.setItem('stride_vehicles', JSON.stringify(vehicles));
    localStorage.setItem('stride_base_odometers', JSON.stringify(baseOdometers));
    localStorage.setItem('stride_last_service_odos', JSON.stringify(lastServiceOdometers));

    closeVehicleModal();
    updateUI();
    alert(`Maklumat kenderaan berjaya disimpan!`);
}

function deleteCurrentVehicle() {
    if (vehicles.length <= 1) {
        alert('Anda mesti mempunyai sekurang-kurangnya satu kenderaan.');
        return;
    }
    if (confirm('Adakah anda pasti mahu memadam kenderaan ini?')) {
        vehicles = vehicles.filter(v => v.id !== activeVehicleId);
        activeVehicleId = vehicles[0].id;
        localStorage.setItem('stride_vehicles', JSON.stringify(vehicles));
        localStorage.setItem('stride_active_vehicle', activeVehicleId);
        closeVehicleModal();
        updateUI();
    }
}

// Form Submit Rekod Harian
form.addEventListener('submit', function(e) {
    e.preventDefault();

    const editId = document.getElementById('editRecordId').value;
    const date = document.getElementById('inputDate').value;
    const gross = parseFloat(document.getElementById('inputGross').value) || 0;
    const trips = parseInt(document.getElementById('inputTrips').value) || 0;
    const km = parseFloat(document.getElementById('inputKm').value) || 0;
    const petrol = parseFloat(document.getElementById('inputPetrol').value) || 0;
    const toll = parseFloat(document.getElementById('inputToll').value) || 0;
    const other = parseFloat(document.getElementById('inputOther').value) || 0;

    const totalCost = petrol + toll + other;
    const netProfit = gross - totalCost;
    const receiptInput = document.getElementById('inputReceipt');
    
    function saveRecordWithReceipt(receiptDataUrl) {
        let recordsList = JSON.parse(localStorage.getItem('stride_records')) || [];

        if (editId) {
            recordsList = recordsList.map(rec => {
                if (rec.id == editId) {
                    return {
                        ...rec,
                        date,
                        gross,
                        trips,
                        km,
                        petrol,
                        toll,
                        other,
                        totalCost,
                        netProfit,
                        vehicleId: activeVehicleId,
                        receipt: receiptDataUrl !== undefined ? receiptDataUrl : rec.receipt
                    };
                }
                return rec;
            });
        } else {
            const newRecord = { 
                id: Date.now(), 
                date, 
                gross, 
                trips, 
                km, 
                petrol, 
                toll, 
                other, 
                totalCost, 
                netProfit,
                vehicleId: activeVehicleId,
                receipt: receiptDataUrl || null
            };
            recordsList.push(newRecord);
        }
        
        recordsList.sort((a, b) => new Date(a.date) - new Date(b.date));
        localStorage.setItem('stride_records', JSON.stringify(recordsList));
        records = recordsList;

        if (date) {
            document.getElementById('monthFilter').value = date.substring(0, 7);
        }

        resetForm();
        updateUI();
    }

    if (receiptInput.files && receiptInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(uploadEvent) {
            saveRecordWithReceipt(uploadEvent.target.result);
        };
        reader.readAsDataURL(receiptInput.files[0]);
    } else {
        saveRecordWithReceipt(undefined);
    }
});

function updateUI() {
    initVehicleDropdown();
    records = JSON.parse(localStorage.getItem('stride_records')) || [];
    records.sort((a, b) => new Date(a.date) - new Date(b.date));

    const historyList = document.getElementById('historyList');
    const selectedMonth = document.getElementById('monthFilter').value;
    historyList.innerHTML = '';

    const vehicleRecords = records.filter(rec => (rec.vehicleId || vehicles[0].id) === activeVehicleId);
    const filteredRecords = selectedMonth 
        ? vehicleRecords.filter(rec => rec.date && rec.date.startsWith(selectedMonth))
        : vehicleRecords;

    let totalGrossAll = 0;
    let totalNetAll = 0;
    let totalCostAll = 0;
    let totalKmAll = 0;
    let grandTotalKmAll = 0;

    vehicleRecords.forEach(rec => {
        grandTotalKmAll += (rec.km || 0);
    });

    let todayGross = 0;
    let monthlyKm = 0;

    if (filteredRecords.length > 0) {
        filteredRecords.forEach(rec => {
            totalGrossAll += rec.gross;
            totalNetAll += rec.netProfit;
            totalCostAll += rec.totalCost;
            totalKmAll += (rec.km || 0);

            if (rec.date === todayStr) {
                todayGross += rec.gross;
            }

            if (rec.date && rec.date.startsWith(currentMonthStr)) {
                monthlyKm += (rec.km || 0);
            }

            const receiptBtn = rec.receipt 
                ? `<button type="button" onclick="viewReceipt('${rec.id}')" class="text-xs bg-blue-900/40 text-blue-400 hover:bg-blue-900/70 px-2 py-1 rounded-lg border border-blue-800/50 flex items-center gap-1 cursor-pointer"><i class="fa-solid fa-receipt"></i> Resit</button>`
                : '';

            const itemHTML = `
                <div class="bg-gray-900/50 p-3 rounded-xl border border-gray-700 flex justify-between items-center text-xs">
                    <div>
                        <span class="font-semibold text-gray-300">${rec.date}</span>
                        <div class="text-gray-400 mt-0.5">${rec.trips} Trip | ${rec.km || 0} km | Minyak: RM${rec.petrol.toFixed(2)}</div>
                        <div class="mt-2 flex items-center gap-2">${receiptBtn}</div>
                    </div>
                    <div class="text-right flex flex-col items-end gap-2">
                        <div>
                            <div class="font-bold text-green-400">+RM${rec.netProfit.toFixed(2)}</div>
                            <div class="text-[10px] text-gray-400">Kasar: RM${rec.gross.toFixed(2)}</div>
                        </div>
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="editRecord(${rec.id})" class="text-gray-400 hover:text-white px-2 py-1 bg-gray-800 rounded-lg cursor-pointer" title="Edit"><i class="fa-solid fa-pen"></i></button>
                            <button type="button" onclick="deleteRecord(${rec.id})" class="text-red-400 hover:text-red-300 px-2 py-1 bg-red-950/40 border border-red-900/50 rounded-lg cursor-pointer" title="Padam"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            `;
            historyList.innerHTML += itemHTML;
        });
    } else {
        historyList.innerHTML = '<p class="text-xs text-gray-400 text-center py-4">Belum ada rekod untuk bulan ini.</p>';
    }

    document.getElementById('summaryGross').innerText = `RM ${totalGrossAll.toFixed(2)}`;
    document.getElementById('summaryNet').innerText = `RM ${totalNetAll.toFixed(2)}`;
    document.getElementById('summaryCost').innerText = `RM ${totalCostAll.toFixed(2)}`;
    document.getElementById('summaryKm').innerText = `${totalKmAll.toFixed(1)} km`;

    const uniqueDays = filteredRecords.length;
    document.getElementById('avgProfitPerDay').innerText = `RM ${uniqueDays > 0 ? (totalNetAll / uniqueDays).toFixed(2) : '0.00'}`;
    document.getElementById('avgKmPerDay').innerText = `${uniqueDays > 0 ? (totalKmAll / uniqueDays).toFixed(1) : '0.0'} km`;

    // Odometer & Tabung Maintenance Kereta Aktif
    const baseOdo = baseOdometers[activeVehicleId] || 0;
    const currentOdometer = baseOdo + grandTotalKmAll;
    document.getElementById('currentOdometerText').innerText = `${currentOdometer.toFixed(0)} km`;
    
    const maintenanceFund = grandTotalKmAll * 0.05;
    document.getElementById('maintenanceFundText').innerText = `RM ${maintenanceFund.toFixed(2)}`;

    // Amaran Minyak Hitam
    const lastSvcOdo = lastServiceOdometers[activeVehicleId] || 0;
    const kmSinceLastService = currentOdometer - lastSvcOdo;
    const kmLeftForService = 10000 - kmSinceLastService;
    const alertEl = document.getElementById('nextServiceAlert');
    
    if (kmLeftForService <= 500 && kmLeftForService > 0) {
        alertEl.className = 'text-[10px] text-yellow-400 font-semibold';
        alertEl.innerText = `⚠️ Lagi ${kmLeftForService.toFixed(0)} KM tukar minyak hitam`;
    } else if (kmLeftForService <= 0) {
        alertEl.className = 'text-[10px] text-red-400 font-semibold';
        alertEl.innerText = `🚨 Dah lewat servis minyak hitam!`;
    } else {
        alertEl.className = 'text-[10px] text-green-400';
        alertEl.innerText = `Minyak hitam: Baki ${kmLeftForService.toFixed(0)} km`;
    }

    updateServiceHistoryUI();
    updateTargetProgress(todayGross);
    updateKmProgress(monthlyKm);
    highlightActiveTargetButton();
    highlightActiveKmButton();

    // Semak Amaran Dokumen & PUSPAKOM
    const activeVehObj = vehicles.find(v => v.id === activeVehicleId);
    checkDocumentAlerts(activeVehObj);

    // Paparkan Graf Prestasi
    renderPerformanceChart(filteredRecords);
}

// Log Servis
function openServiceModal() {
    document.getElementById('editServiceId').value = '';
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceModalTitle').innerHTML = '<i class="fa-solid fa-wrench"></i> Log Servis & Penyelenggaraan';
    document.getElementById('serviceSubmitBtn').innerText = 'Simpan Servis';
    document.getElementById('serviceModal').classList.remove('hidden');
}

function closeServiceModal() {
    document.getElementById('serviceModal').classList.add('hidden');
}

function setServiceType(type) {
    document.getElementById('serviceTypeInput').value = type;
}

function handleServiceSubmit(e) {
    e.preventDefault();
    const editId = document.getElementById('editServiceId').value;
    const type = document.getElementById('serviceTypeInput').value;
    const odo = parseFloat(document.getElementById('serviceOdometerInput').value);
    const cost = parseFloat(document.getElementById('serviceCostInput').value);
    const receiptFile = document.getElementById('serviceReceiptInput').files[0];

    function saveServiceWithReceipt(receiptUrl) {
        if (editId) {
            serviceLogs = serviceLogs.map(s => {
                if (s.id == editId) {
                    return {
                        ...s,
                        type,
                        odo,
                        cost,
                        receipt: receiptUrl !== undefined ? receiptUrl : s.receipt
                    };
                }
                return s;
            });
        } else {
            const newLog = {
                id: Date.now(),
                vehicleId: activeVehicleId,
                type,
                odo,
                cost,
                date: todayStr,
                receipt: receiptUrl || null
            };
            serviceLogs.push(newLog);
            lastServiceOdometers[activeVehicleId] = odo;
            localStorage.setItem('stride_last_service_odos', JSON.stringify(lastServiceOdometers));
        }

        localStorage.setItem('stride_service_logs', JSON.stringify(serviceLogs));
        closeServiceModal();
        updateUI();
        alert('Log servis berjaya disimpan!');
    }

    if (receiptFile) {
        const reader = new FileReader();
        reader.onload = function(e) {
            saveServiceWithReceipt(e.target.result);
        };
        reader.readAsDataURL(receiptFile);
    } else {
        saveServiceWithReceipt(undefined);
    }
}

function updateServiceHistoryUI() {
    const listEl = document.getElementById('serviceHistoryList');
    listEl.innerHTML = '';

    const vehicleLogs = serviceLogs.filter(s => (s.vehicleId || vehicles[0].id) === activeVehicleId);
    vehicleLogs.sort((a, b) => b.odo - a.odo);

    if (vehicleLogs.length === 0) {
        listEl.innerHTML = '<p class="text-[11px] text-gray-500 text-center py-2">Belum ada rekod servis.</p>';
        return;
    }

    vehicleLogs.forEach(s => {
        const receiptBtn = s.receipt 
            ? `<button onclick="viewReceipt('${s.id}', true)" class="text-[10px] text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-900 cursor-pointer">Resit</button>`
            : '';

        listEl.innerHTML += `
            <div class="bg-gray-900/60 p-2.5 rounded-xl border border-gray-800 flex justify-between items-center text-xs">
                <div>
                    <span class="font-semibold text-yellow-300">${s.type}</span>
                    <div class="text-[10px] text-gray-400">Odo: ${s.odo} km | Kos: RM${s.cost.toFixed(2)}</div>
                    <div class="mt-1">${receiptBtn}</div>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="editServiceLog(${s.id})" class="text-gray-400 hover:text-white px-1.5 py-1 bg-gray-800 rounded text-[10px] cursor-pointer"><i class="fa-solid fa-pen"></i></button>
                    <button onclick="deleteServiceLog(${s.id})" class="text-red-400 hover:text-red-300 px-1.5 py-1 bg-red-950/40 rounded text-[10px] cursor-pointer"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    });
}

function editServiceLog(id) {
    const log = serviceLogs.find(s => s.id == id);
    if (!log) return;

    document.getElementById('editServiceId').value = log.id;
    document.getElementById('serviceTypeInput').value = log.type;
    document.getElementById('serviceOdometerInput').value = log.odo;
    document.getElementById('serviceCostInput').value = log.cost;

    document.getElementById('serviceModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-blue-500"></i> Sunting Log Servis';
    document.getElementById('serviceSubmitBtn').innerText = 'Kemaskini Servis';
    document.getElementById('serviceModal').classList.remove('hidden');
}

function deleteServiceLog(id) {
    if (confirm('Padam rekod servis ini?')) {
        serviceLogs = serviceLogs.filter(s => s.id != id);
        localStorage.setItem('stride_service_logs', JSON.stringify(serviceLogs));
        updateUI();
    }
}

function editOdometerSettings() {
    let currentBase = baseOdometers[activeVehicleId] || 0;
    let newBase = prompt('Masukkan bacaan Odometer permulaan untuk kenderaan ini (KM):', currentBase);
    if (newBase !== null && !isNaN(newBase)) {
        baseOdometers[activeVehicleId] = parseFloat(newBase);
        localStorage.setItem('stride_base_odometers', JSON.stringify(baseOdometers));
        updateUI();
    }
}

function editRecord(id) {
    const rec = records.find(r => r.id == id);
    if (!rec) return;

    document.getElementById('editRecordId').value = rec.id;
    document.getElementById('inputDate').value = rec.date;
    document.getElementById('inputGross').value = rec.gross;
    document.getElementById('inputTrips').value = rec.trips;
    document.getElementById('inputKm').value = rec.km || '';
    document.getElementById('inputPetrol').value = rec.petrol || '';
    document.getElementById('inputToll').value = rec.toll || '';
    document.getElementById('inputOther').value = rec.other || '';

    document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-blue-500"></i> Sunting Rekod Harian';
    document.getElementById('submitBtn').innerText = 'Kemaskini Rekod';
    document.getElementById('submitBtn').className = 'flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors shadow-sm cursor-pointer';
    document.getElementById('cancelEditBtn').classList.remove('hidden');

    window.scrollTo({ top: document.getElementById('trackerForm').offsetTop - 50, behavior: 'smooth' });
}

function resetForm() {
    form.reset();
    document.getElementById('editRecordId').value = '';
    document.getElementById('inputDate').valueAsDate = new Date();
    document.getElementById('formTitle').innerHTML = '<i class="fa-solid fa-plus-circle text-green-500"></i> Tambah Rekod Harian';
    document.getElementById('submitBtn').innerText = 'Simpan Rekod';
    document.getElementById('submitBtn').className = 'flex-1 bg-green-500 hover:bg-green-600 text-white font-medium py-2.5 rounded-xl text-sm transition-colors shadow-sm cursor-pointer';
    document.getElementById('cancelEditBtn').classList.add('hidden');
}

function deleteRecord(id) {
    if (confirm('Adakah anda pasti mahu memadam rekod ini?')) {
        records = records.filter(r => r.id != id);
        localStorage.setItem('stride_records', JSON.stringify(records));
        updateUI();
    }
}

function viewReceipt(id, isService = false) {
    let targetObj = isService 
        ? serviceLogs.find(s => s.id == id)
        : records.find(r => r.id == id);

    if (targetObj && targetObj.receipt) {
        document.getElementById('modalReceiptImg').src = targetObj.receipt;
        document.getElementById('receiptModal').classList.remove('hidden');
    }
}

function closeReceiptModal() {
    document.getElementById('receiptModal').classList.add('hidden');
}

function updateTargetProgress(currentAmount) {
    let percentage = (currentAmount / dailyTarget) * 100;
    if (percentage > 100) percentage = 100;
    document.getElementById('targetStatusText').innerText = `RM ${currentAmount.toFixed(2)} / RM ${dailyTarget.toFixed(2)}`;
    document.getElementById('targetPercentage').innerText = `${Math.round((currentAmount / dailyTarget) * 100)}%`;
    document.getElementById('progressBar').style.width = `${percentage}%`;
}

function updateKmProgress(currentKm) {
    let percentage = (currentKm / monthlyKmTarget) * 100;
    if (percentage > 100) percentage = 100;
    document.getElementById('kmTargetStatusText').innerText = `${currentKm.toFixed(1)} km / ${monthlyKmTarget} km`;
    document.getElementById('kmTargetPercentage').innerText = `${Math.round((currentKm / monthlyKmTarget) * 100)}%`;
    document.getElementById('kmProgressBar').style.width = `${percentage}%`;
}

function setQuickTarget(amount) {
    dailyTarget = amount;
    localStorage.setItem('stride_target', dailyTarget);
    updateUI();
}

function setQuickKmTarget(amount) {
    monthlyKmTarget = amount;
    localStorage.setItem('stride_km_target', monthlyKmTarget);
    updateUI();
}

function highlightActiveTargetButton() {
    document.querySelectorAll('.target-btn').forEach(btn => {
        if (parseFloat(btn.innerText.replace('RM', '')) === dailyTarget) {
            btn.classList.add('bg-green-500', 'text-white');
            btn.classList.remove('bg-gray-900', 'text-gray-300');
        } else {
            btn.classList.remove('bg-green-500', 'text-white');
            btn.classList.add('bg-gray-900', 'text-gray-300');
        }
    });
}

function highlightActiveKmButton() {
    document.querySelectorAll('.km-target-btn').forEach(btn => {
        if (parseFloat(btn.innerText.replace(' KM', '')) === monthlyKmTarget) {
            btn.classList.add('bg-blue-500', 'text-white');
            btn.classList.remove('bg-gray-900', 'text-gray-300');
        } else {
            btn.classList.remove('bg-blue-500', 'text-white');
            btn.classList.add('bg-gray-900', 'text-gray-300');
        }
    });
}

function editTarget() {
    let newTarget = prompt('Masukkan sasaran pendapatan harian manual (RM):', dailyTarget);
    if (newTarget !== null && !isNaN(newTarget) && newTarget > 0) {
        dailyTarget = parseFloat(newTarget);
        localStorage.setItem('stride_target', dailyTarget);
        updateUI();
    }
}

function editKmTarget() {
    let newTarget = prompt('Masukkan sasaran mileage bulanan manual (KM):', monthlyKmTarget);
    if (newTarget !== null && !isNaN(newTarget) && newTarget > 0) {
        monthlyKmTarget = parseFloat(newTarget);
        localStorage.setItem('stride_km_target', monthlyKmTarget);
        updateUI();
    }
}

function checkDocumentAlerts(activeVehicle) {
    const alertsEl = document.getElementById('documentAlertsList');
    if (!alertsEl) return;
    alertsEl.innerHTML = '';

    if (!activeVehicle || !activeVehicle.insuranceDate || !activeVehicle.roadtaxDate) {
        alertsEl.innerHTML = `<div class="text-gray-400 text-center py-1 bg-gray-900/40 rounded-lg text-[11px]">Sila klik 'Urus Kereta' untuk tetapkan tarikh dokumen.</div>`;
        return;
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    function getDaysLeft(dateStr) {
        if (!dateStr) return null;
        const target = new Date(dateStr);
        target.setHours(0,0,0,0);
        const diffTime = target - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    const insDays = getDaysLeft(activeVehicle.insuranceDate);
    const roadDays = getDaysLeft(activeVehicle.roadtaxDate);
    const inspDays = getDaysLeft(activeVehicle.inspectionDate);

    function renderBadge(label, days) {
        if (days === null) {
            return `
                <div class="flex justify-between items-center p-2 rounded-lg border text-gray-400 bg-gray-900/30 border-gray-800 text-[11px]">
                    <span>${label}</span>
                    <span>Belum diset</span>
                </div>
            `;
        }
        let colorClass = "text-green-400 bg-green-950/30 border-green-900/40";
        let text = `Baki ${days} hari`;
        if (days < 0) {
            colorClass = "text-red-400 bg-red-950/40 border-red-900/50 font-semibold";
            text = `Telah Tamat!`;
        } else if (days <= 30) {
            colorClass = "text-yellow-400 bg-yellow-950/30 border-yellow-900/40 font-semibold";
            text = `⚠️ Tamat ${days}h lagi`;
        }
        return `
            <div class="flex justify-between items-center p-2 rounded-lg border ${colorClass} text-[11px]">
                <span>${label}</span>
                <span>${text}</span>
            </div>
        `;
    }

    alertsEl.innerHTML += renderBadge('🛡️ Insurans', insDays);
    alertsEl.innerHTML += renderBadge('🏷️ Roadtax', roadDays);
    alertsEl.innerHTML += renderBadge('🔍 PUSPAKOM', inspDays);
}

// Render Graf Chart.js
function renderPerformanceChart(filteredRecords) {
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    const labels = filteredRecords.map(r => r.date);
    const netProfits = filteredRecords.map(r => r.netProfit);
    const grossIncomes = filteredRecords.map(r => r.gross);

    if (performanceChartInstance) {
        performanceChartInstance.destroy();
    }

    performanceChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Untung Bersih (RM)',
                    data: netProfits,
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Pendapatan Kasar (RM)',
                    data: grossIncomes,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#9CA3AF',
                        font: { size: 10 }
                    }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#9CA3AF', font: { size: 9 } },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                },
                y: {
                    ticks: { color: '#9CA3AF', font: { size: 9 } },
                    grid: { color: 'rgba(255, 255, 255, 0.05)' }
                }
            }
        }
    });
}

function exportJsonBackup() {
    if (records.length === 0 && serviceLogs.length === 0) {
        alert('Tiada data untuk dieksport.');
        return;
    }
    const backupData = {
        vehicles,
        activeVehicleId,
        records,
        target: dailyTarget,
        kmTarget: monthlyKmTarget,
        baseOdometers,
        lastServiceOdometers,
        serviceLogs
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `stride_backup_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            if (parsedData.vehicles) {
                vehicles = parsedData.vehicles;
                localStorage.setItem('stride_vehicles', JSON.stringify(vehicles));
            }
            if (parsedData.activeVehicleId) {
                activeVehicleId = parsedData.activeVehicleId;
                localStorage.setItem('stride_active_vehicle', activeVehicleId);
            }
            if (parsedData.records) {
                records = parsedData.records;
                localStorage.setItem('stride_records', JSON.stringify(records));
            }
            if (parsedData.target) {
                dailyTarget = parsedData.target;
                localStorage.setItem('stride_target', dailyTarget);
            }
            if (parsedData.kmTarget) {
                monthlyKmTarget = parsedData.kmTarget;
                localStorage.setItem('stride_km_target', monthlyKmTarget);
            }
            if (parsedData.baseOdometers) {
                baseOdometers = parsedData.baseOdometers;
                localStorage.setItem('stride_base_odometers', JSON.stringify(baseOdometers));
            }
            if (parsedData.lastServiceOdometers) {
                lastServiceOdometers = parsedData.lastServiceOdometers;
                localStorage.setItem('stride_last_service_odos', JSON.stringify(lastServiceOdometers));
            }
            if (parsedData.serviceLogs) {
                serviceLogs = parsedData.serviceLogs;
                localStorage.setItem('stride_service_logs', JSON.stringify(serviceLogs));
            }
            updateUI();
            alert('Data sandaran berjaya dimuat naik!');
        } catch (err) {
            alert('Gagal membaca fail backup.');
        }
    };
    reader.readAsText(file);
}

function exportCsvData() {
    if (records.length === 0) {
        alert('Tiada data untuk dieksport.');
        return;
    }
    let csvContent = "Tarikh,Pendapatan Kasar (RM),Jumlah Trip,Jarak (KM),Minyak (RM),Tol (RM),Lain-lain (RM),Jumlah Kos (RM),Untung Bersih (RM)\r\n";
    records.forEach(rec => {
        csvContent += [rec.date, rec.gross, rec.trips, rec.km || 0, rec.petrol, rec.toll, rec.other, rec.totalCost, rec.netProfit].join(",") + "\r\n";
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    downloadAnchor.setAttribute("download", `stride_report_${todayStr}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function clearData() {
    if (confirm('Adakah anda pasti mahu memadam semua rekod kenderaan ini?')) {
        records = records.filter(r => (r.vehicleId || vehicles[0].id) !== activeVehicleId);
        serviceLogs = serviceLogs.filter(s => (s.vehicleId || vehicles[0].id) !== activeVehicleId);
        localStorage.setItem('stride_records', JSON.stringify(records));
        localStorage.setItem('stride_service_logs', JSON.stringify(serviceLogs));
        updateUI();
    }
}

updateUI();