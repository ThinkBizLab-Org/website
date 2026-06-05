import { AdminUsersPanel } from '@/components/AdminUsersPanel'

export const metadata = { title: 'Admin Users' }

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white mb-1">Admin Users</h1>
        <p className="text-sm" style={{ color: '#9B8EC4' }}>จัดการสิทธิ์ owner, admin, editor และ viewer สำหรับหลังบ้าน</p>
      </div>

      <AdminUsersPanel />
    </div>
  )
}
