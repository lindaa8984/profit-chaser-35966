import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// تحويل التاريخ من YYYY-MM-DD إلى DD-MM-YYYY
export function formatDateDDMMYYYY(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// تحويل التاريخ من DD-MM-YYYY إلى YYYY-MM-DD
export function parseDateDDMMYYYY(dateString: string): string {
  if (!dateString) return '';
  
  // إذا كان بالفعل بتنسيق YYYY-MM-DD، أرجعه كما هو
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // محاولة تحليل أي صيغة للتاريخ مع دعم / و -
  const cleaned = dateString.replace(/[^\d/-]/g, '');
  const parts = cleaned.split(/[-/]/);
  
  if (parts.length === 3) {
    let day, month, year;
    
    // إذا كانت بصيغة DD-MM-YYYY أو DD/MM/YYYY
    if (parts[0].length <= 2 && parts[2].length === 4) {
      [day, month, year] = parts;
    }
    // إذا كانت بصيغة YYYY-MM-DD أو YYYY/MM/DD
    else if (parts[0].length === 4 && parts[2].length <= 2) {
      [year, month, day] = parts;
    }
    else {
      return '';
    }
    
    // التحقق من صحة التاريخ
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12 && yearNum > 1900) {
      const paddedDay = day.padStart(2, '0');
      const paddedMonth = month.padStart(2, '0');
      return `${year}-${paddedMonth}-${paddedDay}`;
    }
  }
  
  return '';
}
