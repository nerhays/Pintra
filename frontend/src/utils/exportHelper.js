import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/* =======================
   EXPORT PDF
======================= */
export const exportToPDF = (data, title = "Monitoring Data", roomNames = {}) => {
  const doc = new jsPDF("l", "mm", "a4");

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 15);

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 22);

  const tableData = data.map((item, index) => [
    index + 1,
    item.namaKegiatan || "-",
    item.peminjam || "-",
    item.ruangNama || roomNames[item.ruangId] || item.ruangId || "-", // ✅ Fix nama ruang
    item.status || "-",
    item.waktuMulaiStr || "-",
    item.waktuSelesaiStr || "-",
  ]);

  autoTable(doc, {
    startY: 28,
    head: [["No", "Nama Kegiatan", "Peminjam", "Ruang", "Status", "Waktu Mulai", "Waktu Selesai"]],
    body: tableData,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
  });

  doc.save(`${title}_${new Date().toISOString().split("T")[0]}.pdf`);
};

/* =======================
   EXPORT EXCEL
======================= */
export const exportToExcel = (data, title = "Monitoring Data", roomNames = {}) => {
  const excelData = data.map((item, index) => ({
    No: index + 1,
    "Nama Kegiatan": item.namaKegiatan || "-",
    Peminjam: item.peminjam || "-",
    Ruang: item.ruangNama || roomNames[item.ruangId] || item.ruangId || "-", // ✅ Fix nama ruang
    Status: item.status || "-",
    "Waktu Mulai": item.waktuMulaiStr || "-",
    "Waktu Selesai": item.waktuSelesaiStr || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // ✅ Auto width untuk kolom
  const maxWidth = excelData.reduce((w, r) => {
    Object.keys(r).forEach((key) => {
      const len = String(r[key]).length;
      w[key] = Math.max(w[key] || 10, len);
    });
    return w;
  }, {});

  worksheet["!cols"] = Object.keys(maxWidth).map((key) => ({
    wch: Math.min(maxWidth[key] + 2, 50),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Monitoring");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `${title}_${new Date().toISOString().split("T")[0]}.xlsx`);
};
/* =======================
   EXPORT VEHICLE PDF
======================= */
export const exportVehicleToPDF = (data, title = "Monitoring Kendaraan") => {
  const doc = new jsPDF("l", "mm", "a4");

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 15);

  // Subtitle
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Dicetak pada: ${new Date().toLocaleString("id-ID")}`, 14, 22);

  const tableData = data.map((item, index) => [
    index + 1,
    item.namaPeminjam || "-",
    item.divisi || "-",
    `${item.vehicleNama}\n${item.vehiclePlat}`,
    item.tujuan || "-",
    item.statusBadge?.label || item.status || "-",
    item.waktuPinjamStr || "-",
    item.waktuKembaliStr || "-",
  ]);

  autoTable(doc, {
    startY: 28,
    head: [["No", "Peminjam", "Divisi", "Kendaraan", "Tujuan", "Status", "Waktu Pinjam", "Waktu Kembali"]],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [102, 126, 234],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: {
      0: { cellWidth: 10 },
      3: { cellWidth: 35 },
    },
  });

  doc.save(`${title}_${new Date().toISOString().split("T")[0]}.pdf`);
};

/* =======================
   EXPORT VEHICLE EXCEL
======================= */
export const exportVehicleToExcel = (data, title = "Monitoring Kendaraan") => {
  const excelData = data.map((item, index) => ({
    No: index + 1,
    Peminjam: item.namaPeminjam || "-",
    Divisi: item.divisi || "-",
    Kendaraan: item.vehicleNama || "-",
    "Plat Nomor": item.vehiclePlat || "-",
    Jenis: item.vehicleJenis || "-",
    Tujuan: item.tujuan || "-",
    "Nomor Surat": item.nomorSurat || "-",
    Status: item.statusBadge?.label || item.status || "-",
    "Waktu Pinjam": item.waktuPinjamStr || "-",
    "Waktu Kembali": item.waktuKembaliStr || "-",
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Auto width
  const maxWidth = excelData.reduce((w, r) => {
    Object.keys(r).forEach((key) => {
      const len = String(r[key]).length;
      w[key] = Math.max(w[key] || 10, len);
    });
    return w;
  }, {});

  worksheet["!cols"] = Object.keys(maxWidth).map((key) => ({
    wch: Math.min(maxWidth[key] + 2, 50),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Monitoring");

  const excelBuffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  saveAs(blob, `${title}_${new Date().toISOString().split("T")[0]}.xlsx`);
};
