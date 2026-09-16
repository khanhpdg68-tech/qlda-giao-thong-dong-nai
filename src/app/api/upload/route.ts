import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Không tìm thấy tệp tải lên' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Chuẩn hóa tên tệp và tạo tên duy nhất
    const originalName = file.name.replace(/\s+/g, '_');
    const timestamp = Date.now();
    const filename = `${timestamp}_${originalName}`;

    // Lưu vào public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${filename}`;
    return NextResponse.json({
      success: true,
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error: any) {
    console.error('Lỗi khi tải tệp lên:', error);
    return NextResponse.json({ error: error.message || 'Lỗi xử lý tệp' }, { status: 500 });
  }
}
