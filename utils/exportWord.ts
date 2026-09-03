import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, AlignmentType, WidthType, VerticalAlign, UnderlineType, PageOrientation } from 'docx';
import { AttendanceRecord, BLOCKS } from '../attendance';
import { Student, GroupConfig, Faculty } from '../types';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export const exportAttendanceToWord = async (
  records: AttendanceRecord[],
  students: Student[],
  groupConfig: GroupConfig,
  faculty: Faculty
) => {
  const tableRows: TableRow[] = [];

  // Header Row 1
  tableRows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "№ п/п", bold: true })], alignment: AlignmentType.CENTER })],
          rowSpan: 2,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "ФИО обучающегося", bold: true })], alignment: AlignmentType.CENTER })],
          rowSpan: 2,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Курс", bold: true })], alignment: AlignmentType.CENTER })],
          rowSpan: 2,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Группа", bold: true })], alignment: AlignmentType.CENTER })],
          rowSpan: 2,
          verticalAlign: VerticalAlign.CENTER,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Количество пропущенных часов", bold: true })], alignment: AlignmentType.CENTER })],
          columnSpan: BLOCKS.length,
          verticalAlign: VerticalAlign.CENTER,
        }),
      ],
    })
  );

  // Header Row 2
  tableRows.push(
    new TableRow({
      children: BLOCKS.map(block => {
        const [year, month, day] = block.end.split('-');
        return new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: `на ${day}.${month}.${year} г.`, bold: true })], alignment: AlignmentType.CENTER })],
          verticalAlign: VerticalAlign.CENTER,
        });
      }),
    })
  );

  // Data Rows
  const today = new Date().toISOString().split('T')[0];

  students.forEach((student, index) => {
    let cumulativeAbsences = 0;
    let cumulativeExcused = 0;
    
    const blockCells = BLOCKS.map(block => {
      let blockAbsences = 0;
      let blockExcused = 0;
      
      records.forEach(record => {
        if (record.isCancelled) return;
        if (record.date >= block.start && record.date <= block.end) {
          const isAbsent = record.absentStudentIds.includes(student.id);
          const isExcused = !isAbsent && (record.excusedStudentIds || []).includes(student.id);
          if (isAbsent) blockAbsences += 2;
          else if (isExcused) blockExcused += 2;
        }
      });
      
      cumulativeAbsences += blockAbsences;
      cumulativeExcused += blockExcused;
      
      const parts = [];
      if (cumulativeAbsences > 0) parts.push(`${cumulativeAbsences} Не УП`);
      if (cumulativeExcused > 0) parts.push(`${cumulativeExcused} УП`);
      const cellText = parts.length > 0 ? parts.join(', ') : '0';

      return new TableCell({
        children: [new Paragraph({ text: cellText, alignment: AlignmentType.CENTER })],
        verticalAlign: VerticalAlign.CENTER,
      });
    });

    const groupName = groupConfig.name || '3-ИНГТ-110';

    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: (index + 1).toString(), alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [new Paragraph({ text: student.name })],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [new Paragraph({ text: (groupConfig.course || 3).toString(), alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
          }),
          new TableCell({
            children: [new Paragraph({ text: groupName, alignment: AlignmentType.CENTER })],
            verticalAlign: VerticalAlign.CENTER,
          }),
          ...blockCells,
        ],
      })
    );
  });

  const table = new Table({
    rows: tableRows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 1000,
              right: 1000,
              bottom: 1000,
              left: 1000,
            },
          },
        },
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Сведение",
                bold: true,
                size: 24, // 12pt
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Количество пропусков занятий без уважительных причин в осеннем семестре 2026-2027 уч.г.",
                bold: true,
                size: 24, // 12pt
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: faculty?.name || "Институт нефтегазовых технологий",
                bold: true,
                size: 24,
                underline: {
                  type: UnderlineType.SINGLE,
                  color: "000000"
                }
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "(наименование структурного подразделения)",
                italics: true,
                size: 20, // 10pt
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            },
          }),
          table,
        ],
      },
    ],
  });

  const filename = `Пропуски_${groupConfig.name || '3-ИНГТ-110'}.docx`;
  const blob = await Packer.toBlob(doc);

  // Try native Capacitor mobile save & share first
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.includes(',') ? res.split(',')[1] : res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      try {
        await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Documents
        });
      } catch (docErr) {
        console.warn('Writing to Documents directory warning:', docErr);
      }

      if (result && result.uri) {
        await Share.share({
          title: `Отчет пропусков (${groupConfig.name})`,
          text: `Официальный отчет пропусков СамГТУ (${groupConfig.name})`,
          files: [result.uri],
          dialogTitle: 'Сохранить или отправить Word (.docx) отчет'
        });
        return;
      }
    } catch (nativeError) {
      console.warn('Native share failed, falling back to browser blob download:', nativeError);
    }
  }

  // Fallback: Standard browser / webview download
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 2000);
};
