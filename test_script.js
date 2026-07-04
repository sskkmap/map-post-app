const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();
wb.xlsx.readFile('public/visit_management_data_2026-07-04.xlsx').then(async () => {
    const ws = wb.getWorksheet('定期患者');
    ws.dataValidations.add('F2:F1000', {
        type: 'list',
        allowBlank: true,
        showErrorMessage: true,
        formulae: ['リスト!$A:$A']
    });
    await wb.xlsx.writeFile('test.xlsx');
    console.log('Saved test.xlsx');
}).catch(e => console.error(e));
