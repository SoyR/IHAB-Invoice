// 앱별 저장소 분리: 같은 origin에서 다른 IHAB 앱과 데이터가 섞이지 않도록 고유 접두어 사용
const PRODUCT_ID = 'soundcompass';
const STORAGE_PREFIX = 'soundcompass_';
// 옵션 목록 구조 버전
// v1: 국내용 커스텀=index 11 / 수출용 Laptop=11, Chair=12, 커스텀=13
// v2: 국내용에 단품 노트북(index 11) 추가, 커스텀=12
// v3: 단품 노트북 삭제 → 국내용 커스텀=11 / 수출용 Chair=11, 커스텀=12
// v4: 5F 고급형 풀패키지(옵션1)=0, 7F 고급형 풀패키지(옵션2)=1, 커스텀(옵션3)=2 만 유지 (국내용·수출용 동일)
const OPTIONS_VERSION = 4;

const optionData = {
    center: [
        {
            id: "옵션1",
            title: "소리방향성시스템 기본 패키지 + 하드웨어 구성_5F 고급형 풀패키지",
            cost: 18100000, basePrice: 18100000, discountPrice: 14840000,
            desc: `<div class="desc-l1">소리방향성시스템 기본 패키지</div>
<div class="desc-l2">소프트웨어</div>
<div class="desc-l3">소리방향성시스템 소프트웨어 라이선스(5년)</div>
<div class="desc-l3">시스템 설치 및 최적화 구축</div>
<div class="desc-l3">초기 성능 검증 및 시스템 점검</div>
<div class="desc-l2">하드웨어</div>
<div class="desc-l3">피검사용 검사 터치패드</div>
<div class="desc-l3">피검자용 맞춤 제작 의자 &amp; 거치대 세트</div>
<div class="desc-l1">하드웨어 구성_5F 고급형 풀패키지</div>
<div class="desc-l2">국제표준 기반 5채널 스피커 프레임 시스템</div>
<div class="desc-l2">[검사용 스피커_고급형] GENELEC 8010A × 5</div>
<div class="desc-l3">전원선 세트</div>
<div class="desc-l3">연결 오디오 케이블</div>
<div class="desc-l3">멀티탭</div>
<div class="desc-l2">Motu UltraLite mk5</div>
<div class="desc-l2">검사 전용 노트북(소프트웨어 설치)</div>`
        },
        {
            id: "옵션2",
            title: "소리방향성시스템 기본 패키지 + 하드웨어 구성_7F 고급형 풀패키지",
            cost: 22010000, basePrice: 22010000, discountPrice: 17430000,
            desc: `<div class="desc-l1">소리방향성시스템 기본 패키지</div>
<div class="desc-l2">소프트웨어</div>
<div class="desc-l3">소리방향성시스템 소프트웨어 라이선스(5년)</div>
<div class="desc-l3">시스템 설치 및 최적화 구축</div>
<div class="desc-l3">초기 성능 검증 및 시스템 점검</div>
<div class="desc-l2">하드웨어</div>
<div class="desc-l3">피검사용 검사 터치패드</div>
<div class="desc-l3">피검자용 맞춤 제작 의자 &amp; 거치대 세트</div>
<div class="desc-l1">하드웨어 구성_7F 고급형 풀패키지</div>
<div class="desc-l2">국제표준 기반 7채널 스피커 프레임 시스템</div>
<div class="desc-l2">[검사용 스피커_고급형] GENELEC 8010A × 7</div>
<div class="desc-l3">전원선 세트</div>
<div class="desc-l3">연결 오디오 케이블</div>
<div class="desc-l3">멀티탭</div>
<div class="desc-l2">Motu UltraLite mk5</div>
<div class="desc-l2">검사 전용 노트북(소프트웨어 설치)</div>`
        },
        {
            id: "옵션3",
            title: "",
            cost: 0, basePrice: 0, discountPrice: 0,
            isCustom: true,
            desc: ""
        }
    ]
};

// 수출은 국내용 패키지(옵션1~2) 복사본 + 커스텀 옵션(옵션3)
optionData.export = [
    // 패키지 상세 구성의 '검사 전용 노트북(소프트웨어 설치)'는 영문 문서에서 Laptop computer 로 변환됨
    ...optionData.center.filter(i => !i.isCustom).map(i => ({ ...i })),
    { id: "옵션3", title: "", cost: 0, basePrice: 0, discountPrice: 0, isCustom: true, desc: "" }
];
// 'center' 키는 저장된 견적서 호환을 위해 유지, 화면 표기는 '국내용'
const typeLabels = { center: '국내용', export: '수출용' };
function hasCenterOptions(type) { return type === 'center' || type === 'export'; }

// ── 커스텀 옵션 상세 구성 ──
// 커스텀 옵션은 다른 옵션의 상세 구성 항목을 체크박스로 고르고(picks), 필요하면 직접 입력(useText + desc)을 덧붙임
// 선택지: 다른 옵션들의 상세 구성을 합친 트리. key 는 상위 항목까지의 경로라 같은 항목은 한 번만 나옴
function getCustomPickList(type) {
    const list = [];
    (optionData[type] || []).filter(i => !i.isCustom).forEach(item => {
        const path = [];
        for (const m of item.desc.matchAll(/<div class="desc-l(\d)">([\s\S]*?)<\/div>/g)) {
            const level = Number(m[1]);
            path.length = level - 1;
            path[level - 1] = m[2];
            const key = path.slice(0, level).join(' > ');
            if (list.some(p => p.key === key)) continue;
            const parentKey = path.slice(0, level - 1).join(' > ');
            // 새 항목은 상위 항목의 마지막 하위 항목 뒤에 넣어 트리 순서 유지
            let at = list.length;
            const parentAt = parentKey ? list.findIndex(p => p.key === parentKey) : -1;
            if (parentAt >= 0) {
                at = parentAt + 1;
                while (at < list.length && list[at].key.startsWith(parentKey + ' > ')) at++;
            }
            list.splice(at, 0, { key, text: m[2], level });
        }
    });
    return list;
}

// 직접 입력 사용 여부 (예전 견적서는 useText 없이 desc 만 있으므로 desc 가 있으면 사용으로 간주)
function customUsesText(item) {
    return item.useText ?? !!(item.desc && item.desc.trim());
}

// 문서에 들어갈 커스텀 옵션 상세 구성 HTML
function buildCustomDescHtml(item, type) {
    const picks = new Set(item.picks || []);
    const picked = getCustomPickList(type)
        .filter(p => picks.has(p.key))
        .map(p => `<div class="desc-l${p.level}">${p.text}</div>`)
        .join('\n');
    const typed = customUsesText(item)
        ? (item.desc || '').split('\n').filter(l => l.trim()).map(l => `<div class="desc-l3">${l}</div>`).join('')
        : '';
    return translateItemText(picked) + typed;
}

// 수출용 고정 비고 (청구서는 견적 유효기간 문구 제외)
const exportTerms = {
    validity: 'This quotation is valid for 30 days from the date of issue.',
    payment: 'Payment Terms: Payment is due within 30 days after delivery.',
    trade: 'Trade Terms: All import duties, customs clearance fees, taxes, and any other charges levied in the destination country shall be borne by the Buyer.'
};

function getExportRemarks() {
    const lines = docType === 'invoice'
        ? [exportTerms.payment, exportTerms.trade]
        : [exportTerms.validity, exportTerms.payment, exportTerms.trade];
    return lines.map((line, i) => `${i + 1}. ${line}`).join('\n');
}

// 견적서 문서 다국어 문구 (입력 화면은 한글 고정, 생성 문서에만 적용)
const invoiceText = {
    ko: {
        brand: '사운드컴퍼스 견적서',
        companyName: '(주)아이해브',
        address: '<span class="company-info-label">주소 :</span> 경기 안양시 동안구 흥안대로 457-25 605호',
        phone: '<span class="company-info-label">전화번호 :</span> 031-496-8330',
        cell: '',
        email: '<span class="company-info-label">이메일 :</span> support@ihab.co.kr',
        recipient: '견적 수신처',
        numberKey: '견적 번호:',
        dateKey: '견적 일자:',
        validityKey: '유효 기한:',
        validityVal: '발급일로부터 30일',
        thCode: '코드',
        thItem: '품목명 및 상세 구성',
        thQty: '수량',
        thUnit: '단가 (공급가액)',
        thAmount: '합계금액 (VAT 포함)',
        remarksTitle: '비고 및 특이사항',
        bankTitle: '입금 계좌 안내',
        dueTitle: '지급 기한',
        totalTitle: '총 견적 금액 (합계)',
        bankInfo: '신한은행 140-014-875639<br>예금주: (주)아이해브',
        thanks: '귀사의 무궁한 발전을 기원합니다. 감사합니다.',
        sealLabel: '(주)아이해브 대표이사',
        manager: '담당자:',
        managerDefault: '귀하',
        qtyUnit: '개',
        summary: '합 계',
        customTitle: '커스텀 옵션',
        defaultRemarks: '특이사항 없음. 본 견적서의 유효기간은 발행일로부터 30일입니다.',
        fileLabel: '아이해브견적서'
    },
    // 국내용 거래명세서: ko 문구 위에 덮어씀
    koStatement: {
        brand: '사운드컴퍼스 거래명세서',
        recipient: '수신처',
        numberKey: '번호:',
        dateKey: '일자:',
        totalTitle: '총 금액 (합계)',
        defaultRemarks: '특이사항 없음.',
        fileLabel: '아이해브거래명세서'
    },
    en: {
        companyName: 'IHAB Co., Ltd.',
        address: '<span class="company-info-label">Address :</span> #605, 457-25 Heungan-daero, Dongan-gu,<br>Anyang-si, Gyeonggi-do, Republic of Korea',
        phone: '<span class="company-info-label">Tel :</span> +82-31-496-8330',
        cell: '<span class="company-info-label">Cell :</span> +82-10-9057-5425',
        email: '<span class="company-info-label">Email :</span> support@ihab.co.kr',
        thCode: 'Code',
        thItem: 'Item &amp; Description',
        thQty: 'Qty',
        thUnit: 'Unit Price',
        thAmount: 'Amount',
        remarksTitle: 'Remarks',
        bankTitle: 'Bank Details',
        bankInfo: 'Shinhan Bank / Account No. 140-014-875639<br>SWIFT: SHBKKRSE<br>Beneficiary: IHAB Co., Ltd.<br>Bank Address: 20, Sejong-Daero 9-Gil, Jung-Gu, Seoul, South Korea (Zip code: 04513)',
        thanks: 'Thank you for your business.',
        sealLabel: 'IHAB Co., Ltd. CEO',
        manager: 'Attn:',
        managerDefault: '-',
        qtyUnit: '',
        summary: 'TOTAL',
        customTitle: 'Custom Option',
        dueVal: 'Within 30 days after delivery'
    },
    quotation: {
        brand: 'SoundCompass',
        recipient: 'Quotation To',
        numberKey: 'Quotation No.:',
        dateKey: 'Quotation Date:',
        validityKey: 'Valid For:',
        validityVal: '30 days from the date of issue',
        dueTitle: 'Payment Due',
        totalTitle: 'Total Quotation Amount',
        fileLabel: 'IHAB-Quotation'
    },
    invoice: {
        brand: 'SoundCompass',
        recipient: 'Bill To',
        numberKey: 'Invoice No.:',
        dateKey: 'Invoice Date:',
        validityKey: 'Payment Terms:',
        validityVal: 'Within 30 days after delivery',
        dueTitle: 'Due Date',
        totalTitle: 'Total Amount Due',
        fileLabel: 'IHAB-Invoice'
    }
};

// 품목명/상세 구성 영문 변환 (긴 문구 우선 치환)
const itemPhraseEn = [
    [/소리방향성시스템 소프트웨어 라이선스\(5년\)/g, 'SoundCompass Software License (5 years)'],
    [/소리방향성시스템 기본 패키지/g, 'SoundCompass Basic Package'],
    [/시스템 설치 및 최적화 구축/g, 'System Installation &amp; Optimization'],
    [/초기 성능 검증 및 시스템 점검/g, 'Initial Performance Verification &amp; System Inspection'],
    [/피검사용 검사 터치패드/g, 'Touchpad for Examinee Testing'],
    [/검사 전용 노트북\(소프트웨어 설치\)/g, 'Laptop computer'],
    [/피검자용 맞춤 제작 의자 &amp; 거치대 세트/g, 'Sound Localization Testing Chair &amp; Stand Set'],
    [/국제표준 기반 (\d+)채널 스피커 프레임 시스템/g, 'International Standard-based $1-Channel Speaker Frame System'],
    [/검사용 스피커/g, 'Test Speaker'],
    [/전원선 세트/g, 'Power Cable Set'],
    [/연결 오디오 케이블/g, 'Audio Connection Cables'],
    [/멀티탭/g, 'Power Strip'],
    [/하드웨어 구성/g, 'Hardware Configuration'],
    [/하드웨어/g, 'Hardware'],
    [/소프트웨어/g, 'Software'],
    [/풀패키지/g, 'Full Package'],
    [/고급형/g, 'Premium'],
    [/기본형/g, 'Standard']
];

function translateItemText(text) {
    if (docLang !== 'en') return text;
    return itemPhraseEn.reduce((s, [pattern, en]) => s.replace(pattern, en), text);
}

let currentType = "";
let selectedOptions = [];
let currentEditingId = null;
let currentInvoiceNumber = null;
let applyDiscount = false;
let docLang = 'ko';            // 'ko' | 'en' (수출 구분일 때 'en')
let docType = 'quotation';     // 국내용: 'quotation' | 'statement'(거래명세서) / 수출용: 'quotation' | 'invoice'
let docCurrency = 'KRW';       // 'KRW' | 'USD' (영문 전용)

function getInvoiceText() {
    if (docLang === 'en') return { ...invoiceText.en, ...invoiceText[docType] };
    return isStatement() ? { ...invoiceText.ko, ...invoiceText.koStatement } : invoiceText.ko;
}

// 국내용 거래명세서: 유효 기한·입금 계좌 안내·지급 기한 없이 표시
function isStatement() { return docLang === 'ko' && docType === 'statement'; }

function isUSD() { return docLang === 'en' && docCurrency === 'USD'; }
// 수출(영문) 문서는 VAT 없음
function isExport() { return docLang === 'en'; }
function round2(n) { return Math.round(n * 100) / 100; }

// USD 문서는 품목별로 직접 입력한 opt.usdPrice 사용
function unitPriceOf(opt, usd) {
    return usd ? (opt.usdPrice || 0) : (opt.price || 0);
}
// USD 는 달러 정수 단위로 계산 (VAT 는 1달러 단위 반올림), vatFree 면 세액 0
function taxOf(supply, usd, vatFree) {
    if (vatFree) return 0;
    return usd ? Math.round(supply * 0.1) : Math.floor(supply * 0.1);
}
function supplyOf(opts, usd) {
    const sum = opts.reduce((s, o) => s + unitPriceOf(o, usd) * (o.qty || 1), 0);
    return usd ? round2(sum) : sum;
}

function fmtMoney(n) {
    if (docLang === 'ko') return `${fmt(n)} 원`;
    if (docCurrency === 'USD') return `USD ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    return `KRW ${n.toLocaleString('en-US')}`;
}

function formatDocDate(dateObj) {
    if (docLang === 'en') {
        return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return `${dateObj.getFullYear()}년 ${dateObj.getMonth()+1}월 ${dateObj.getDate()}일`;
}

function toggleDiscount() {
    applyDiscount = document.getElementById('discountToggle').checked;
    if (hasCenterOptions(currentType)) {
        selectedOptions.forEach(opt => {
            const item = optionData[currentType][opt.index];
            opt.price = applyDiscount ? item.discountPrice : item.basePrice;
        });
    }
    renderOptions();
    updateTotalFromOptions();
}

function generateInvoiceNumber() {
    const today = new Date().toISOString().substring(0, 10);
    const key = `${STORAGE_PREFIX}daily_counter_${today}`;
    const next = parseInt(localStorage.getItem(key) || '0') + 1;
    localStorage.setItem(key, next.toString());
    return `${today}-${String(next).padStart(2, '0')}`;
}

document.getElementById('inputDate').value = new Date().toISOString().substring(0, 10);

function goStep(stepNum) {
    document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
    document.getElementById('step' + stepNum).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectType(type) {
    currentType = type;
    selectedOptions = [];
    applyDiscount = false;
    // 수출은 영문 문서(기본 USD), 국내용은 한글 문서
    docLang = type === 'export' ? 'en' : 'ko';
    docType = 'quotation';
    docCurrency = type === 'export' ? 'USD' : 'KRW';
    syncDocSettingsUI();
    const toggle = document.getElementById('discountToggle');
    if (toggle) toggle.checked = false;
    document.getElementById('typeTitleText').innerText = `견적구성 _ ${typeLabels[type]} 옵션 선택`;
    renderOptions();
    goStep(2);
}

function renderOptions() {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = "";
    const items = optionData[currentType];
    const isCenter = hasCenterOptions(currentType);

    items.forEach((item, index) => {
        const sel = selectedOptions.find(o => o.index === index);
        const isSelected = !!sel;
        const price = sel ? sel.price : '';
        const qty = sel ? sel.qty : 1;

        const card = document.createElement('div');
        card.className = 'option-card' + (isSelected ? ' selected' : '');
        card.id = `opt-card-${index}`;

        if (item.isCustom) {
            card.innerHTML = `
                <div class="option-header" onclick="toggleCardSelection(${index})">
                    <div class="option-headline-left">
                        <input type="checkbox" class="option-checkbox" id="chk-${index}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleCardSelection(${index})">
                        <span class="option-number">${item.id}</span>
                        <span class="option-product-name" id="custom-title-display-${index}">${item.title || '커스텀 직접 입력'}</span>
                    </div>
                    <button type="button" class="toggle-btn" id="toggle-btn-${index}" onclick="toggleFold(event, ${index})">${isSelected ? '접기' : '펼치기'}</button>
                </div>
                <div class="option-body${isSelected ? ' expanded' : ''}" id="opt-body-${index}">
                    <div class="composition-title">품목명 및 상세 구성 직접 입력</div>
                    <div class="custom-field-group">
                        <label class="custom-field-label">품목명</label>
                        <input type="text" class="custom-field-input" id="custom-title-${index}"
                               value="${item.title || ''}" placeholder="예: 소리방향성시스템 맞춤형 패키지"
                               oninput="updateCustomField(${index})" onclick="event.stopPropagation()">
                    </div>
                    <div class="custom-field-group">
                        <label class="custom-field-label">품목 및 상세 구성</label>
                        <div class="custom-pick-list" onclick="event.stopPropagation()">
                            ${getCustomPickList(currentType).map((p, i) => `
                            <label class="custom-pick custom-pick-l${p.level}">
                                <input type="checkbox" id="pick-${index}-${i}" ${(item.picks || []).includes(p.key) ? 'checked' : ''}
                                       onchange="toggleCustomPick(${index}, ${i}, this.checked)">
                                <span>${p.text}</span>
                            </label>`).join('')}
                            <label class="custom-pick custom-pick-l1">
                                <input type="checkbox" id="custom-text-on-${index}" ${customUsesText(item) ? 'checked' : ''}
                                       onchange="toggleCustomText(${index}, this.checked)">
                                <span>직접 입력</span>
                            </label>
                            <textarea class="custom-field-textarea custom-pick-textarea" id="custom-desc-${index}"
                                      style="display:${customUsesText(item) ? 'block' : 'none'}"
                                      placeholder="상세 구성을 입력하세요 (줄바꿈으로 항목 구분)"
                                      oninput="updateCustomField(${index})">${item.desc || ''}</textarea>
                        </div>
                    </div>
                </div>
                <div class="custom-price-section">
                    <div class="custom-price-inputs">
                        <div class="price-input-col">
                            <div class="price-info-label">공개용 기준가</div>
                            <div class="custom-price-input-wrap">
                                <input type="number" class="custom-price-field" id="custom-base-${index}"
                                       value="${item.basePrice || ''}" placeholder="기준가 입력"
                                       oninput="updateCustomField(${index})" onclick="event.stopPropagation()">
                                <span class="custom-price-unit">원</span>
                            </div>
                        </div>
                        <div class="price-input-col">
                            <div class="price-info-label">안내용 할인가</div>
                            <div class="custom-price-input-wrap">
                                <input type="number" class="custom-price-field" id="custom-discount-${index}"
                                       value="${item.discountPrice || ''}" placeholder="할인가 입력"
                                       oninput="updateCustomField(${index})" onclick="event.stopPropagation()">
                                <span class="custom-price-unit">원</span>
                            </div>
                        </div>
                    </div>
                    <div class="option-qty-row ${isSelected ? 'visible' : ''}" id="qty-group-${index}">
                        <span class="option-qty-label">수량</span>
                        <input type="number" class="option-qty-input" id="qty-${index}" value="${qty}" min="1" oninput="updateQty(${index})">
                        <span class="option-qty-unit">개</span>
                    </div>
                </div>
            `;
        } else {
            let priceSection = '';
            if (isCenter) {
                const discPct = (item.basePrice > 0 && item.discountPrice < item.basePrice)
                    ? Math.round((1 - item.discountPrice / item.basePrice) * 100) : 0;
                const priceText = n => (item.directPrice && !n) ? '직접 입력' : `${n.toLocaleString('ko-KR')} 원`;
                priceSection = `
                    <div class="option-price-info">
                        <div class="price-info-col">
                            <div class="price-info-label">공개용 기준가</div>
                            <div class="price-info-value ${applyDiscount ? '' : 'highlight'}" id="price-display-base-${index}">${priceText(item.basePrice)}</div>
                        </div>
                        <div class="price-info-col">
                            <div class="price-info-label">안내용 할인가</div>
                            <div class="price-info-value ${applyDiscount ? 'highlight' : ''}" id="price-display-discount-${index}">${priceText(item.discountPrice)}${applyDiscount && discPct > 0 ? ` <span class="price-info-badge">-${discPct}%</span>` : ''}</div>
                        </div>
                    </div>
                    <div class="option-qty-row ${isSelected ? 'visible' : ''}" id="qty-group-${index}">
                        <span class="option-qty-label">수량</span>
                        <input type="number" class="option-qty-input" id="qty-${index}" value="${qty}" min="1" oninput="updateQty(${index})">
                        <span class="option-qty-unit">개</span>
                    </div>`;
            } else {
                priceSection = `
                    <div class="option-price-row ${isSelected ? 'visible' : ''}" id="price-group-${index}">
                        <span class="option-price-label">단가</span>
                        <input type="number" class="option-price-input" id="price-${index}" value="${price}" placeholder="금액 입력" oninput="updateOptionPrice(${index})">
                        <span class="option-price-unit">원</span>
                        <span class="option-qty-label" style="margin-left:8px;">수량</span>
                        <input type="number" class="option-qty-input" id="qty-${index}" value="${qty}" min="1" oninput="updateQty(${index})">
                        <span class="option-qty-unit">개</span>
                    </div>`;
            }

            const initDiscPct = (item.basePrice > 0 && item.discountPrice < item.basePrice)
                ? Math.round((1 - item.discountPrice / item.basePrice) * 100) : 0;

            card.innerHTML = `
                <div class="option-header" onclick="toggleCardSelection(${index})">
                    <div class="option-headline-left">
                        <input type="checkbox" class="option-checkbox" id="chk-${index}" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation(); toggleCardSelection(${index})">
                        <span class="option-number">${item.id}</span>
                        <span class="option-product-name">${item.title}</span>
                    </div>
                    <button type="button" class="toggle-btn" id="toggle-btn-${index}" onclick="toggleFold(event, ${index})">펼치기</button>
                </div>
                <div class="option-body" id="opt-body-${index}">
                    <div class="composition-title">상세 품목 구성</div>
                    <div class="composition-text">${item.desc}</div>
                    <div class="composition-title" style="margin-top:20px; padding-top:16px; border-top:1px dashed #e2e8f0;">가격 수정</div>
                    <div style="display:flex; border:1px solid #e8edf3; border-radius:6px; overflow:hidden; margin-top:6px;">
                        <div class="price-input-col">
                            <div class="price-info-label">공개용 기준가</div>
                            <div class="custom-price-input-wrap">
                                <input type="number" class="custom-price-field" id="edit-base-${index}" value="${item.basePrice}" placeholder="기준가 입력" oninput="updateOptionPriceField(${index})" onclick="event.stopPropagation()">
                                <span class="custom-price-unit">원</span>
                            </div>
                        </div>
                        <div class="price-input-col">
                            <div class="price-info-label">안내용 할인가 <span class="rate-badge" id="edit-disc-badge-${index}" style="display:${initDiscPct > 0 ? 'inline-block' : 'none'};">${initDiscPct > 0 ? `-${initDiscPct}%` : ''}</span></div>
                            <div class="custom-price-input-wrap">
                                <input type="number" class="custom-price-field" id="edit-discount-${index}" value="${item.discountPrice}" placeholder="할인가 입력" oninput="updateOptionPriceField(${index})" onclick="event.stopPropagation()">
                                <span class="custom-price-unit">원</span>
                            </div>
                        </div>
                    </div>
                </div>
                ${priceSection}
            `;
        }
        container.appendChild(card);
    });
}

function toggleCardSelection(index) {
    const checkbox = document.getElementById(`chk-${index}`);
    const card = document.getElementById(`opt-card-${index}`);
    const isCenter = hasCenterOptions(currentType);
    const existingIdx = selectedOptions.findIndex(o => o.index === index);

    if (existingIdx >= 0) {
        selectedOptions.splice(existingIdx, 1);
        card.classList.remove('selected');
        checkbox.checked = false;
        if (isCenter) {
            document.getElementById(`qty-group-${index}`).classList.remove('visible');
        } else {
            document.getElementById(`price-group-${index}`).classList.remove('visible');
        }
    } else {
        const price = isCenter ? (applyDiscount ? optionData[currentType][index].discountPrice : optionData[currentType][index].basePrice) : 0;
        const qtyEl = document.getElementById(`qty-${index}`);
        const initQty = qtyEl ? Math.max(1, parseInt(qtyEl.value) || 1) : 1;
        selectedOptions.push({ index, price, qty: initQty });
        card.classList.add('selected');
        checkbox.checked = true;
        if (isCenter) {
            document.getElementById(`qty-group-${index}`).classList.add('visible');
            if (optionData[currentType][index]?.isCustom) {
                const body = document.getElementById(`opt-body-${index}`);
                const btn = document.getElementById(`toggle-btn-${index}`);
                if (body && !body.classList.contains('expanded')) {
                    body.classList.add('expanded');
                    if (btn) btn.innerText = '접기';
                }
                document.getElementById(`custom-title-${index}`)?.focus();
            } else {
                document.getElementById(`qty-${index}`).focus();
            }
        } else {
            document.getElementById(`price-group-${index}`).classList.add('visible');
            document.getElementById(`price-${index}`).focus();
        }
    }
    updateTotalFromOptions();
}

function toggleFold(event, index) {
    event.stopPropagation();
    const body = document.getElementById(`opt-body-${index}`);
    const btn = document.getElementById(`toggle-btn-${index}`);
    if (body.classList.contains('expanded')) {
        body.classList.remove('expanded');
        btn.innerText = "펼치기";
    } else {
        body.classList.add('expanded');
        btn.innerText = "접기";
    }
}

// 항목 체크: 하위 항목은 함께 체크/해제, 체크 시 상위 항목도 체크해 문서 구조 유지
function toggleCustomPick(index, pickIdx, checked) {
    const item = optionData[currentType][index];
    const list = getCustomPickList(currentType);
    const key = list[pickIdx].key;
    const picks = new Set(item.picks || []);
    list.forEach(p => {
        const isSelfOrChild = p.key === key || p.key.startsWith(key + ' > ');
        const isAncestor = key.startsWith(p.key + ' > ');
        if (isSelfOrChild) checked ? picks.add(p.key) : picks.delete(p.key);
        else if (isAncestor && checked) picks.add(p.key);
    });
    item.picks = list.filter(p => picks.has(p.key)).map(p => p.key);
    list.forEach((p, i) => {
        const el = document.getElementById(`pick-${index}-${i}`);
        if (el) el.checked = picks.has(p.key);
    });
}

function toggleCustomText(index, checked) {
    optionData[currentType][index].useText = checked;
    const ta = document.getElementById(`custom-desc-${index}`);
    if (!ta) return;
    ta.style.display = checked ? 'block' : 'none';
    if (checked) ta.focus();
}

function updateCustomField(index) {
    const item = optionData[currentType][index];
    const titleVal = document.getElementById(`custom-title-${index}`)?.value || '';
    const descVal = document.getElementById(`custom-desc-${index}`)?.value || '';
    const baseVal = parseFloat(document.getElementById(`custom-base-${index}`)?.value) || 0;
    const discountVal = parseFloat(document.getElementById(`custom-discount-${index}`)?.value) || 0;

    item.title = titleVal;
    item.desc = descVal;
    item.basePrice = baseVal;
    item.discountPrice = discountVal;
    item.cost = baseVal;

    const display = document.getElementById(`custom-title-display-${index}`);
    if (display) display.innerText = titleVal || '커스텀 직접 입력';

    const opt = selectedOptions.find(o => o.index === index);
    if (opt) {
        opt.price = applyDiscount ? discountVal : baseVal;
        updateTotalFromOptions();
    }
}

function updateOptionPriceField(index) {
    const item = optionData[currentType][index];
    const baseVal = Math.round(parseFloat(document.getElementById(`edit-base-${index}`)?.value) || 0);
    const discountVal = Math.round(parseFloat(document.getElementById(`edit-discount-${index}`)?.value) || 0);

    item.basePrice = baseVal;
    item.discountPrice = discountVal;
    item.cost = baseVal;

    const discPct = (baseVal > 0 && discountVal < baseVal)
        ? Math.round((1 - discountVal / baseVal) * 100) : 0;

    const badge = document.getElementById(`edit-disc-badge-${index}`);
    if (badge) {
        badge.style.display = discPct > 0 ? 'inline-block' : 'none';
        badge.innerText = discPct > 0 ? `-${discPct}%` : '';
    }

    const basePriceDisplay = document.getElementById(`price-display-base-${index}`);
    const discountPriceDisplay = document.getElementById(`price-display-discount-${index}`);
    if (basePriceDisplay) {
        basePriceDisplay.className = `price-info-value ${applyDiscount ? '' : 'highlight'}`;
        basePriceDisplay.innerText = baseVal.toLocaleString('ko-KR') + ' 원';
    }
    if (discountPriceDisplay) {
        discountPriceDisplay.className = `price-info-value ${applyDiscount ? 'highlight' : ''}`;
        discountPriceDisplay.innerHTML = discountVal.toLocaleString('ko-KR') + ' 원' +
            (applyDiscount && discPct > 0 ? ` <span class="price-info-badge">-${discPct}%</span>` : '');
    }

    const opt = selectedOptions.find(o => o.index === index);
    if (opt) {
        opt.price = applyDiscount ? discountVal : baseVal;
        updateTotalFromOptions();
    }
}

function updateOptionPrice(index) {
    const price = parseFloat(document.getElementById(`price-${index}`).value) || 0;
    const opt = selectedOptions.find(o => o.index === index);
    if (opt) opt.price = price;
    updateTotalFromOptions();
}

function updateQty(index) {
    const raw = parseInt(document.getElementById(`qty-${index}`).value);
    const opt = selectedOptions.find(o => o.index === index);
    if (opt && raw >= 1) {
        opt.qty = raw;
        updateTotalFromOptions();
    }
}

function syncQtyFromDOM() {
    selectedOptions.forEach(opt => {
        const el = document.getElementById(`qty-${opt.index}`);
        if (el) {
            const val = Math.max(1, parseInt(el.value) || 1);
            el.value = val;
            opt.qty = val;
        }
        if (!hasCenterOptions(currentType)) {
            const priceEl = document.getElementById(`price-${opt.index}`);
            if (priceEl) opt.price = parseFloat(priceEl.value) || 0;
        }
        if (hasCenterOptions(currentType) && optionData[currentType][opt.index]?.isCustom) {
            updateCustomField(opt.index);
        }
    });
}

function updateTotalFromOptions() {
    const usd = isUSD();
    const totalSupply = supplyOf(selectedOptions, usd);
    const tax = taxOf(totalSupply, usd, isExport());
    const total = usd ? round2(totalSupply + tax) : totalSupply + tax;
    const show = n => usd ? fmtMoney(n) : n.toLocaleString('ko-KR');
    document.getElementById('inputSupplyPrice').value = show(totalSupply);
    document.getElementById('inputTaxPrice').value = show(tax);
    document.getElementById('inputTotalPrice').value = show(total);
}

// Step 3 수출 문서 설정(종류/통화) → 상태 반영
function onDocSettingsChange() {
    docType = document.getElementById('inputDocType').value;
    docCurrency = document.getElementById('inputCurrency').value;
    updateDocSettingsVisibility();
    renderItemOrderList();
    updateTotalFromOptions();
}

// Step 2 국내용 문서 종류(견적서/거래명세서) 라디오 → 상태 반영
function onDocTypeKoChange(value) {
    docType = value;
    updateDocSettingsVisibility();
    renderItemOrderList();
}

// 입력 화면 문구: 국내용 거래명세서는 '견적' 대신 거래명세서 문구 사용
function getUiText() {
    return isStatement()
        ? { docName: '거래명세서', dateLabel: '일자', totalLabel: '총 금액 (합계 - 자동계산)' }
        : { docName: '견적서', dateLabel: '견적일자', totalLabel: '총 견적금액 (합계 - 자동계산)' };
}

// 상태 → Step 3 문서 설정 입력값
function syncDocSettingsUI() {
    if (docLang === 'en') document.getElementById('inputDocType').value = docType;
    document.querySelectorAll('input[name="docTypeKo"]').forEach(r => { r.checked = r.value === docType; });
    document.getElementById('inputCurrency').value = docCurrency;
    updateDocSettingsVisibility();
    renderItemOrderList();
}

function updateDocSettingsVisibility() {
    document.getElementById('docSettingsBar').style.display = docLang === 'en' ? 'grid' : 'none';
    document.getElementById('docTypeKoBar').style.display = docLang === 'ko' && currentType ? 'flex' : 'none';
    const ui = getUiText();
    document.getElementById('labelDate').innerText = ui.dateLabel;
    document.getElementById('labelTotalPrice').innerText = ui.totalLabel;
    document.getElementById('inputRemarks').placeholder = `${ui.docName} 하단 비고란에 기재될 내용을 입력하세요.`;
    document.getElementById('step2Desc').innerText = `제공 품목 중 ${ui.docName}에 포함할 옵션을 선택하고 상세 구성을 확인해 주세요.`;
    document.getElementById('discountToggleDesc').innerText = `체크 시 할인율과 할인가가 ${ui.docName}에 표시됩니다`;
    document.getElementById('btnGenerate').innerText = `${ui.docName} 최종 생성`;
    document.getElementById('generatedNotice').innerText =
        `🎉 ${ui.docName} 문서 생성이 완료되었습니다. 아래 인쇄 버튼을 누르거나 Ctrl+P로 저장 가능합니다.`;
    document.getElementById('taxPriceGroup').style.display = isExport() ? 'none' : 'flex';
}

// Step 3 품목 순서 목록 (selectedOptions 순서 = 견적서 행 순서), 수출 USD 는 단가 입력 포함
function renderItemOrderList() {
    const container = document.getElementById('itemOrderList');
    if (!currentType) { container.innerHTML = ''; return; }
    const usd = isUSD();
    const last = selectedOptions.length - 1;
    document.getElementById('itemOrderDesc').innerText = usd
        ? '▲▼ 버튼으로 순서를 바꾸고, 품목별 단가를 달러로 입력해 주세요.'
        : `▲▼ 버튼으로 ${getUiText().docName}에 표시될 순서를 바꿀 수 있습니다.`;
    container.innerHTML = selectedOptions.map((opt, pos) => {
        const item = optionData[currentType][opt.index];
        const title = translateItemText(item.title) || getInvoiceText().customTitle;
        const meta = usd
            ? `수량 ${opt.qty || 1}`
            : `${opt.qty || 1}개 · ${fmt(opt.price || 0)} 원`;
        const usdInput = usd ? `
                <div class="custom-price-input-wrap">
                    <input type="number" class="custom-price-field" id="usd-${opt.index}" step="1" min="0"
                           value="${opt.usdPrice != null ? opt.usdPrice : ''}"
                           placeholder="USD 단가 입력"
                           oninput="updateUsdPrice(${opt.index})">
                    <span class="custom-price-unit">USD</span>
                </div>` : '';
        return `
            <div class="item-order-row${usd ? ' with-usd' : ''}">
                <div class="item-order-btns">
                    <button type="button" class="item-order-btn" onclick="moveItem(${pos}, -1)" ${pos === 0 ? 'disabled' : ''} title="위로">▲</button>
                    <button type="button" class="item-order-btn" onclick="moveItem(${pos}, 1)" ${pos === last ? 'disabled' : ''} title="아래로">▼</button>
                </div>
                <div class="item-order-name">${pos + 1}. ${item.id} · ${title}</div>
                <div class="item-order-meta">${meta}</div>${usdInput}
            </div>`;
    }).join('');
}

function moveItem(pos, dir) {
    const target = pos + dir;
    if (target < 0 || target >= selectedOptions.length) return;
    [selectedOptions[pos], selectedOptions[target]] = [selectedOptions[target], selectedOptions[pos]];
    renderItemOrderList();
}

function hasAllUsdPrices() {
    return selectedOptions.every(o => o.usdPrice > 0);
}

function updateUsdPrice(index) {
    const raw = document.getElementById(`usd-${index}`).value.trim();
    const opt = selectedOptions.find(o => o.index === index);
    if (!opt) return;
    opt.usdPrice = raw === '' ? null : Math.round(parseFloat(raw) || 0);
    updateTotalFromOptions();
}

function validateAndGoStep3() {
    if (selectedOptions.length === 0) {
        alert("품목 옵션을 하나 이상 선택해 주세요.");
        return;
    }
    syncQtyFromDOM();
    if (hasCenterOptions(currentType)) {
        const customIdx = optionData[currentType].findIndex(i => i.isCustom);
        const hasCustom = selectedOptions.some(o => o.index === customIdx);
        if (hasCustom && !optionData[currentType][customIdx].title.trim()) {
            alert(`커스텀 옵션(${optionData[currentType][customIdx].id})의 품목명을 입력해 주세요.`);
            return;
        }
    }
    updateTotalFromOptions();
    renderItemOrderList();
    goStep(3);
}

function fmt(n) { return n.toLocaleString('ko-KR'); }

function buildInvoiceRows() {
    const t = getInvoiceText();
    const isCenter = hasCenterOptions(currentType);
    const usd = isUSD();
    const totalSupply = supplyOf(selectedOptions, usd);
    const grandTotal = usd ? round2(totalSupply + taxOf(totalSupply, usd, isExport())) : totalSupply + taxOf(totalSupply, usd, isExport());

    let rows = selectedOptions.map(opt => {
        const item = optionData[currentType][opt.index];
        const unitPrice = unitPriceOf(opt, usd);
        const qty = opt.qty || 1;
        const lineSupply = usd ? round2(unitPrice * qty) : unitPrice * qty;
        const lineTotal = usd ? round2(lineSupply + taxOf(lineSupply, usd, isExport())) : lineSupply + taxOf(lineSupply, usd, isExport());

        // USD 문서는 원화 기준가가 없으므로 할인 표기 없이 입력 단가만 표시
        let priceCell = '';
        if (isCenter && !usd && item.basePrice && applyDiscount) {
            const discPct = Math.round((1 - unitPrice / item.basePrice) * 100);
            priceCell = `
                <div class="rate-base">${fmtMoney(item.basePrice)} <span class="rate-badge">-${discPct}%</span></div>
                <div class="rate-discount">${fmtMoney(unitPrice)}</div>`;
        } else {
            priceCell = fmtMoney(unitPrice);
        }

        const displayTitle = translateItemText(item.title) || (item.isCustom ? t.customTitle : '');
        const descHtml = item.isCustom
            ? buildCustomDescHtml(item, currentType)
            : translateItemText(item.desc);

        return `
            <tr>
                <td class="col-code" style="font-weight:700; font-size:14px; color:#499cdf;">${item.id.replace('옵션', '')}</td>
                <td>
                    <div class="table-item-title">${displayTitle}</div>
                    <div class="table-item-desc">${descHtml}</div>
                </td>
                <td class="text-right" style="font-weight:600; color:#202020;">${qty}${t.qtyUnit}</td>
                <td class="text-right rate-cell">${priceCell}</td>
                <td class="text-right total-cell">${fmtMoney(lineTotal)}</td>
            </tr>
        `;
    }).join('');

    if (selectedOptions.length > 1) {
        // 수출 문서는 합계 행을 품목 단가(18px)와 같은 크기로 표시
        const [labelSize, supplySize, totalSize] = isExport() ? [18, 18, 18] : [13, 14, 15];
        rows += `
            <tr class="invoice-summary-row">
                <td colspan="${isExport() ? 2 : 3}" class="text-right" style="font-weight:700; font-size:${labelSize}px; color:#64748b; vertical-align:middle;">${t.summary}</td>
                <td class="text-right" style="font-weight:700; font-size:${supplySize}px; color:#202020; vertical-align:middle;">${fmtMoney(totalSupply)}</td>
                <td class="text-right" style="font-weight:800; font-size:${totalSize}px; color:#499cdf; vertical-align:middle;">${fmtMoney(grandTotal)}</td>
            </tr>
        `;
    }
    return { rows, totalSupply, grandTotal };
}

// 현재 상태 + Step 3 입력값으로 견적서 문서를 그려 미리보기로 전환
function renderInvoiceDocument() {
    const t = getInvoiceText();
    const clientName = document.getElementById('inputClientName').value.trim();
    const managerName = document.getElementById('inputManagerName').value.trim();
    const invoiceDate = document.getElementById('inputDate').value;
    const remarks = document.getElementById('inputRemarks').value.trim();

    document.querySelectorAll('#invoicePreviewWrapper [data-i18n]').forEach(el => {
        el.innerHTML = t[el.dataset.i18n];
    });
    document.querySelector('.invoice-brand-text').classList.toggle('brand-export', isExport());
    // 거래명세서는 유효 기한·입금 계좌 안내·지급 기한 숨김
    const statement = isStatement();
    document.getElementById('pdfValidityRow').style.display = statement ? 'none' : '';
    document.querySelectorAll('.banner-bank-col, .banner-due-col').forEach(el => { el.style.display = statement ? 'none' : ''; });

    document.getElementById('pdfInvoiceNumber').innerText = currentInvoiceNumber || '-';
    document.getElementById('pdfClientName').innerText = clientName;
    document.getElementById('pdfManagerName').innerHTML = `<span style="color:#94a3b8;">${t.manager}</span> ${managerName || t.managerDefault}`;

    const dateObj = new Date(invoiceDate);
    document.getElementById('pdfDate').innerText = formatDocDate(dateObj);

    const dueDateObj = new Date(dateObj);
    dueDateObj.setDate(dueDateObj.getDate() + 30);
    // 수출은 납품 기준 지급이므로 날짜 대신 조건 문구 표시
    document.getElementById('pdfDueDateBanner').innerText = isExport() ? t.dueVal : formatDocDate(dueDateObj);

    const { rows, grandTotal } = buildInvoiceRows();
    document.getElementById('invoiceTableBody').innerHTML = rows;
    document.getElementById('invoiceTable').classList.toggle('no-code', isExport());

    document.getElementById('pdfGrandTotalBanner').innerText = fmtMoney(grandTotal);
    document.getElementById('pdfRemarks').innerText = isExport()
        ? getExportRemarks() + (remarks ? '\n' + remarks : '')
        : (remarks || t.defaultRemarks);

    document.getElementById('workspaceContainer').style.display = "none";
    document.getElementById('invoicePreviewWrapper').style.display = "block";
}

function generateInvoice() {
    const clientName = document.getElementById('inputClientName').value.trim();
    const invoiceDate = document.getElementById('inputDate').value;

    syncQtyFromDOM();
    if (!clientName) { alert("고객명을 입력해 주세요."); return; }
    if (!invoiceDate) { alert(`${getUiText().dateLabel}를 선택해 주세요.`); return; }
    if (selectedOptions.length === 0) { alert("옵션을 선택해 주세요."); return; }
    if (isUSD() && !hasAllUsdPrices()) { alert("모든 품목의 USD 단가를 입력해 주세요."); return; }

    const totalSupply = selectedOptions.reduce((sum, o) => sum + (o.price || 0), 0);
    if (!hasCenterOptions(currentType) && totalSupply <= 0) {
        alert("옵션별 공급가액을 입력해 주세요."); return;
    }

    if (!currentInvoiceNumber) currentInvoiceNumber = generateInvoiceNumber();
    renderInvoiceDocument();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function printInvoice() {
    const today = new Date().toISOString().substring(0, 10).replace(/-/g, '');
    const clientName = document.getElementById('pdfClientName').innerText.trim() || (docLang === 'en' ? 'Client' : '기관명');
    const originalTitle = document.title;
    document.title = `${today}-${getInvoiceText().fileLabel}-${clientName}`;
    window.onafterprint = () => {
        document.title = originalTitle;
        window.onafterprint = null;
    };
    window.print();
}

function resetSystem() {
    document.getElementById('inputClientName').value = "";
    document.getElementById('inputManagerName').value = "";
    document.getElementById('inputSupplyPrice').value = "0";
    document.getElementById('inputTaxPrice').value = "0";
    document.getElementById('inputTotalPrice').value = "0";
    document.getElementById('inputRemarks').value = "";
    selectedOptions = [];
    currentEditingId = null;
    currentInvoiceNumber = null;
    applyDiscount = false;
    docLang = 'ko';
    docType = 'quotation';
    docCurrency = 'KRW';
    syncDocSettingsUI();
    const toggle = document.getElementById('discountToggle');
    if (toggle) toggle.checked = false;
    [optionData.center, optionData.export].forEach(items => {
        const custom = items.find(i => i.isCustom);
        if (custom) Object.assign(custom, { title: '', desc: '', picks: [], useText: false, basePrice: 0, discountPrice: 0, cost: 0 });
    });

    document.getElementById('workspaceContainer').style.display = "block";
    document.getElementById('invoicePreviewWrapper').style.display = "none";
    renderSavedList();
    goStep(1);
}

function getSavedList() {
    return JSON.parse(localStorage.getItem(STORAGE_PREFIX + 'invoices') || '[]').map(migrateInvoice);
}

// 이전 버전으로 저장된 견적서의 옵션 index 를 현재(v4) 목록에 맞게 보정
// 현재 남아 있는 5F·7F 고급형 풀패키지·커스텀만 새 index 로 옮기고, 삭제된 옵션은 제외
const LEGACY_INDEX_MAP = {
    center: { 1: { 9: 0, 10: 1, 11: 2 }, 2: { 9: 0, 10: 1, 12: 2 }, 3: { 9: 0, 10: 1, 11: 2 } },
    export: { 1: { 9: 0, 10: 1, 13: 2 }, 2: { 9: 0, 10: 1, 13: 2 }, 3: { 9: 0, 10: 1, 12: 2 } }
};
function migrateInvoice(inv) {
    const ver = inv.optionsVersion || 1;
    if (ver >= OPTIONS_VERSION) return inv;
    const map = LEGACY_INDEX_MAP[inv.type]?.[ver];
    if (!map) return inv;
    const options = inv.selectedOptions
        || [{ index: inv.selectedOptionIndex, price: inv.supplyVal || 0, qty: 1 }];
    const migrated = options
        .filter(o => o.index in map)
        .map(o => ({ ...o, index: map[o.index] }));
    return { ...inv, selectedOptions: migrated, optionsVersion: OPTIONS_VERSION };
}

function saveInvoice() {
    syncQtyFromDOM();
    const id = currentEditingId || Date.now().toString();

    let customSnapshot = null;
    if (hasCenterOptions(currentType)) {
        const customIdx = optionData[currentType].findIndex(i => i.isCustom);
        if (customIdx >= 0 && selectedOptions.some(o => o.index === customIdx)) {
            const ci = optionData[currentType][customIdx];
            customSnapshot = { title: ci.title, desc: ci.desc, picks: ci.picks || [], useText: customUsesText(ci), basePrice: ci.basePrice, discountPrice: ci.discountPrice };
        }
    }

    const invoice = {
        id,
        invoiceNumber: currentInvoiceNumber,
        applyDiscount,
        docLang,
        docType,
        currency: docCurrency,
        product: PRODUCT_ID,
        optionsVersion: OPTIONS_VERSION,
        savedAt: new Date().toISOString(),
        type: currentType,
        selectedOptions: [...selectedOptions],
        customSnapshot,
        clientName: document.getElementById('inputClientName').value.trim(),
        managerName: document.getElementById('inputManagerName').value.trim(),
        invoiceDate: document.getElementById('inputDate').value,
        remarks: document.getElementById('inputRemarks').value.trim()
    };

    const list = getSavedList();
    const existingIdx = list.findIndex(i => i.id === id);
    if (existingIdx >= 0) {
        list[existingIdx] = invoice;
    } else {
        list.unshift(invoice);
    }
    localStorage.setItem(STORAGE_PREFIX + 'invoices', JSON.stringify(list));
    currentEditingId = invoice.id;
    alert('견적서가 저장되었습니다.');
}

function getTotalFromInv(inv) {
    if (inv.selectedOptions) {
        return inv.selectedOptions.reduce((s, o) => s + (o.price || 0) * (o.qty || 1), 0);
    }
    return inv.supplyVal || 0;
}

function renderSavedList() {
    const list = getSavedList();
    const section = document.getElementById('savedListSection');
    const container = document.getElementById('savedListContainer');
    const countEl = document.getElementById('savedListCount');

    if (list.length === 0) { section.style.display = 'none'; return; }
    section.style.display = 'block';
    countEl.innerText = `총 ${list.length}건`;

    container.innerHTML = list.map(inv => {
        const invUSD = inv.docLang === 'en' && inv.currency === 'USD';
        let totalLabel;
        if (invUSD) {
            const supply = supplyOf(inv.selectedOptions || [], true);
            const total = supply;  // 수출 문서는 VAT 없음
            totalLabel = `USD ${total.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
        } else {
            const totalSupply = getTotalFromInv(inv);
            const vat = inv.docLang === 'en' ? 0 : Math.floor(totalSupply * 0.1);
            totalLabel = `${fmt(totalSupply + vat)}원`;
        }
        const langLabel = inv.docLang === 'en'
            ? ` · ${inv.docType === 'invoice' ? 'Invoice' : 'Quotation'}`
            : (inv.docType === 'statement' ? ' · 거래명세서' : '');
        const typeLabel = (typeLabels[inv.type] || inv.type) + langLabel;
        const optCount = inv.selectedOptions ? inv.selectedOptions.length : 1;
        const firstOptIdx = inv.selectedOptions ? inv.selectedOptions[0]?.index : inv.selectedOptionIndex;
        const firstItem = optionData[inv.type][firstOptIdx];
        const firstTitle = (firstItem?.isCustom)
            ? (inv.customSnapshot?.title || '커스텀 옵션')
            : (firstItem?.title || '');
        const optLabel = optCount > 1 ? `옵션 ${optCount}개` : firstTitle;

        return `
            <div class="saved-item-card">
                <div>
                    <div class="saved-item-client">${inv.clientName}</div>
                    <div class="saved-item-meta">${typeLabel} · ${optLabel} · ${inv.invoiceDate} · 합계 ${totalLabel}</div>
                </div>
                <div class="saved-item-actions">
                    <button class="btn-secondary" style="padding:6px 14px; font-size:13px;" onclick="viewInvoice('${inv.id}')">보기</button>
                    <button class="btn-secondary" style="padding:6px 14px; font-size:13px;" onclick="editInvoice('${inv.id}')">수정</button>
                    <button class="btn-danger" onclick="deleteInvoice('${inv.id}')">삭제</button>
                </div>
            </div>
        `;
    }).join('');
}

function restoreInvoiceState(inv) {
    currentType = inv.type;
    applyDiscount = inv.applyDiscount || false;
    docLang = inv.docLang || 'ko';
    docType = inv.docType || 'quotation';
    docCurrency = inv.currency || 'KRW';
    const toggle = document.getElementById('discountToggle');
    if (toggle) toggle.checked = applyDiscount;
    if (inv.selectedOptions) {
        selectedOptions = inv.selectedOptions.map(o => ({ ...o, qty: o.qty || 1 }));
    } else {
        selectedOptions = [{ index: inv.selectedOptionIndex, price: inv.supplyVal || 0, qty: 1 }];
    }
    if (inv.customSnapshot && hasCenterOptions(inv.type)) {
        const customIdx = optionData[currentType].findIndex(i => i.isCustom);
        if (customIdx >= 0) Object.assign(optionData[currentType][customIdx], { picks: [], useText: undefined }, inv.customSnapshot);
    }
    syncDocSettingsUI();
}

function viewInvoice(id) {
    const inv = getSavedList().find(i => i.id === id);
    if (!inv) return;

    currentEditingId = inv.id;
    currentInvoiceNumber = inv.invoiceNumber || null;
    restoreInvoiceState(inv);

    document.getElementById('inputClientName').value = inv.clientName;
    document.getElementById('inputManagerName').value = inv.managerName;
    document.getElementById('inputDate').value = inv.invoiceDate;
    document.getElementById('inputRemarks').value = inv.remarks || '';
    updateTotalFromOptions();

    renderInvoiceDocument();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteInvoice(id) {
    if (!confirm('이 견적서를 삭제하시겠습니까?')) return;
    const list = getSavedList().filter(i => i.id !== id);
    localStorage.setItem(STORAGE_PREFIX + 'invoices', JSON.stringify(list));
    renderSavedList();
}

function editInvoice(id) {
    const inv = getSavedList().find(i => i.id === id);
    if (!inv) return;

    currentEditingId = inv.id;
    currentInvoiceNumber = inv.invoiceNumber || null;
    restoreInvoiceState(inv);

    document.getElementById('typeTitleText').innerText =
        `견적구성 _ ${typeLabels[currentType]} 옵션 선택`;
    renderOptions();

    document.getElementById('inputClientName').value = inv.clientName;
    document.getElementById('inputManagerName').value = inv.managerName;
    document.getElementById('inputDate').value = inv.invoiceDate;
    document.getElementById('inputRemarks').value = inv.remarks || '';
    updateTotalFromOptions();

    goStep(2);
}

// 새로고침 시 작업 화면 유지: 페이지를 떠날 때 현재 상태를 탭 단위(sessionStorage)로 보관
const SESSION_KEY = STORAGE_PREFIX + 'working_state';
const sessionFormFields = ['inputClientName', 'inputManagerName', 'inputDate', 'inputRemarks'];

function getCurrentView() {
    if (document.getElementById('invoicePreviewWrapper').style.display === 'block') return 'preview';
    const active = document.querySelector('.step-section.active');
    return active ? active.id : 'step1';
}

function saveSessionState() {
    if (currentType) syncQtyFromDOM();
    const state = {
        view: getCurrentView(),
        currentType, selectedOptions, applyDiscount,
        docLang, docType, docCurrency,
        currentEditingId, currentInvoiceNumber,
        // Step 2 에서 수정한 가격/커스텀 입력 보존
        items: currentType
            ? optionData[currentType].map(i => {
                const prices = { basePrice: i.basePrice, discountPrice: i.discountPrice, cost: i.cost };
                return i.isCustom ? { ...prices, title: i.title, desc: i.desc, picks: i.picks || [], useText: customUsesText(i) } : prices;
            })
            : null,
        form: Object.fromEntries(sessionFormFields.map(id => [id, document.getElementById(id).value]))
    };
    try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch (e) {}
}

function restoreSessionState() {
    let state = null;
    try { state = JSON.parse(sessionStorage.getItem(SESSION_KEY)); } catch (e) {}
    if (!state || !state.currentType || state.view === 'step1') return;
    // 옵션 구성이 바뀐 이전 세션은 index 가 어긋나므로 복원하지 않음
    if (state.items && state.items.length !== optionData[state.currentType]?.length) return;

    ({ currentType, selectedOptions, applyDiscount, docLang, docType, docCurrency, currentEditingId, currentInvoiceNumber } = state);
    // 품목명/구성은 코드의 최신 값 유지, 가격만 복원 (커스텀 옵션은 입력 내용까지 복원)
    if (state.items) state.items.forEach((saved, i) => {
        const item = optionData[currentType][i];
        if (!item) return;
        const { basePrice, discountPrice, cost, title, desc, picks, useText } = saved;
        Object.assign(item, { basePrice, discountPrice, cost },
            item.isCustom ? { title: title || '', desc: desc || '', picks: picks || [], useText } : {});
    });
    sessionFormFields.forEach(id => { document.getElementById(id).value = state.form[id] || ''; });

    document.getElementById('discountToggle').checked = applyDiscount;
    document.getElementById('typeTitleText').innerText = `견적구성 _ ${typeLabels[currentType]} 옵션 선택`;
    syncDocSettingsUI();
    renderOptions();
    updateTotalFromOptions();

    if (state.view === 'preview') {
        renderInvoiceDocument();
    } else {
        document.querySelectorAll('.step-section').forEach(s => s.classList.remove('active'));
        document.getElementById(state.view).classList.add('active');
    }
}

window.addEventListener('pagehide', saveSessionState);

renderSavedList();
restoreSessionState();

// 스크롤 휠로 number input 값이 변경되는 브라우저 기본 동작 방지
document.addEventListener('wheel', function () {
    if (document.activeElement.type === 'number') {
        document.activeElement.blur();
    }
}, { capture: true, passive: true });
