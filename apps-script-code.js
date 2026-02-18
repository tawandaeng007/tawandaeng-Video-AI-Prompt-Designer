// ============================================================
// Google Apps Script — Prompt Library Web App
// ============================================================
// วิธีใช้:
// 1. เปิด Google Sheet ที่อัพข้อมูลไว้
// 2. ไปที่ Extensions > Apps Script
// 3. ลบโค้ดเดิมทั้งหมด แล้ววางโค้ดนี้ลงไป
// 4. กด Deploy > New deployment
// 5. เลือก Type: Web app
// 6. ตั้งค่า:
//    - Description: Prompt Library API
//    - Execute as: Me
//    - Who has access: Anyone
// 7. กด Deploy แล้วคัดลอก Web app URL
// 8. เอา URL ไปใส่ในไฟล์ index.html ตรง APPS_SCRIPT_URL
// ============================================================

function doPost(e) {
    try {
        const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        const data = JSON.parse(e.postData.contents);

        // หา ID ถัดไป
        const lastRow = sheet.getLastRow();
        let nextId = 1;
        if (lastRow > 1) {
            const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat().filter(v => v !== '');
            nextId = Math.max(...ids.map(Number)) + 1;
        }

        // เพิ่มแถวใหม่ที่ด้านบนสุด (แถวที่ 2 หลัง header)
        sheet.insertRowAfter(1);
        sheet.getRange(2, 1, 1, 9).setValues([[
            nextId,
            data.title || '',
            data.category || '',
            data.tool || '',
            data.preview || '',
            data.prompt || '',
            data.videoUrl || '',
            data.isFeatured === true || data.isFeatured === 'TRUE' ? 'TRUE' : 'FALSE',
            data.icon || ''
        ]]);

        return ContentService
            .createTextOutput(JSON.stringify({ success: true, id: nextId }))
            .setMimeType(ContentService.MimeType.JSON);
    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

function doGet(e) {
    return ContentService
        .createTextOutput(JSON.stringify({ status: 'ok', message: 'Prompt Library API is running' }))
        .setMimeType(ContentService.MimeType.JSON);
}
