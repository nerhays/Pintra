import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* =======================
   EXPORT PDF
======================= */
export const exportToPDF = (data, title = "Monitoring Data") => {
  const doc = new jsPDF("l", "mm", "a4");

  doc.setFontSize(14);
  doc.text(title, 14, 15);

  const tableData = data.map((item, index) => [
    index + 1,
    item.namaKegiatan || "-",
    item.peminjam?.nama || "-",
    item.ruang?.nama || "-",
    item.ruang?.status || "-",
    item.waktuMulai?.toDate
      ? item.waktuMulai.toDate().toLocaleString("id-ID")
      : "-",
    item.waktuSelesai?.toDate
      ? item.waktuSelesai.toDate().toLocaleString("id-ID")
      : "-",
  ]);

  autoTable(doc, {
    startY: 25,
    head: [
      [
        "No",
        "Nama Kegiatan",
        "Peminjam",
        "Ruang",
        "Status",
        "Waktu Mulai",
        "Waktu Selesai",
      ],
    ],
    body: tableData,
    styles: { fontSize: 9 },
  });

  doc.save(`${title}.pdf`);
};

/* =======================
   EXPORT EXCEL
======================= */
export const exportToExcel = (data, title = "Monitoring Data") => {
  const excelData = data.map((item, index) => ({
    No: index + 1,
    "Nama Kegiatan": item.namaKegiatan || "-",
    Peminjam: item.peminjam?.nama || "-",
    Ruang: item.ruang?.nama || "-",
    Status: item.ruang?.status || "-",
    "Waktu Mulai": item.waktuMulai?.toDate
      ? item.waktuMulai.toDate().toLocaleString("id-ID")
      : "-",
    "Waktu Selesai": item.waktuSelesai?.toDate
      ? item.waktuSelesai.toDate().toLocaleString("id-ID")
      : "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Monitoring");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/octet-stream",
  });

  saveAs(blob, `${title}.xlsx`);
};
