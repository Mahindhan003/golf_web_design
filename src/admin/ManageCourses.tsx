import { useState } from 'react'
import type { Course } from '../types'
import { MOCK_COURSES, MOCK_TOURNAMENTS } from '../data'
import { useDataVersion, upsertCourse, deleteCourse } from '../store'
import { PageHeader } from '../shell'
import { Button, SearchInput, EmptyState } from '../components'
import { useApp } from '../app-context'
import { navigate } from '../router'
import { CourseForm } from './forms'
import { IconPlus, IconPencil, IconTrash } from './AdminShell'
import { BackLink } from '../screens/TournamentDetails'

export function useConfirmDeleteCourse() {
  const { showDialog, showToast } = useApp()
  return (c: Course, after?: () => void) => {
    const used = MOCK_TOURNAMENTS.filter(t => t.courseId === c.id).length
    if (used) {
      showDialog({
        title: "Can't delete this course",
        message: `${used} tournament${used > 1 ? 's are' : ' is'} held at ${c.name}. Move ${used > 1 ? 'them' : 'it'} to another course or delete ${used > 1 ? 'them' : 'it'} first.`,
        confirmLabel: 'View tournaments',
        cancelLabel: 'OK',
        onConfirm: () => navigate('/admin/tournaments'),
      })
      return
    }
    showDialog({
      title: 'Delete course?',
      message: `"${c.name}" and its scorecard will be removed. This can't be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: () => {
        const r = deleteCourse(c.id)
        if (r.ok) { showToast('Course deleted', 'info'); after?.() }
        else showToast(r.reason, 'error')
      },
    })
  }
}

/* ───────── List ───────── */

export function AdminCourses() {
  useDataVersion()
  const confirmDelete = useConfirmDeleteCourse()
  const [search, setSearch] = useState('')
  const q = search.trim().toLowerCase()
  const rows = MOCK_COURSES.filter(c => !q || [c.name, c.city, c.region, c.designer].some(v => v.toLowerCase().includes(q)))

  return (
    <div className="page-in">
      <PageHeader
        eyebrow="Admin console"
        title="Courses"
        actions={<Button onClick={() => navigate('/admin/courses/new')}><IconPlus /> New course</Button>}
      />

      <div className="max-w-[440px] mb-5"><SearchInput value={search} onChange={setSearch} placeholder="Search courses…" /></div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-[28px] shadow-card">
          <EmptyState
            title={MOCK_COURSES.length ? 'No matching courses' : 'No courses yet'}
            subtitle={MOCK_COURSES.length ? 'Try a different search.' : 'Add a course before creating tournaments.'}
            action={MOCK_COURSES.length ? { label: 'Clear search', onClick: () => setSearch('') } : { label: 'New course', onClick: () => navigate('/admin/courses/new') }}
          />
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {rows.map(c => {
            const events = MOCK_TOURNAMENTS.filter(t => t.courseId === c.id).length
            return (
              <article key={c.id} className="bg-white rounded-[28px] shadow-card p-2 flex flex-col">
                <a href={`#/admin/courses/${c.id}`} className="relative h-40 rounded-[22px] overflow-hidden block">
                  <img src={c.imageUrl} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-3 left-3 glass-dark h-6 px-2.5 rounded-full text-[11px] font-semibold font-display text-white inline-flex items-center">
                    {events} event{events === 1 ? '' : 's'}
                  </span>
                </a>
                <div className="px-3 pt-3.5 pb-2 flex-1 flex flex-col">
                  <h3 className="font-display font-bold text-ink text-[16px] tracking-tight">{c.name}</h3>
                  <p className="text-[12px] text-gray-500 mt-0.5">{c.city}, {c.region}</p>
                  <div className="grid grid-cols-4 gap-1.5 mt-3">
                    {[[c.holes, 'Holes'], [c.par, 'Par'], [c.yardage.toLocaleString(), 'Yds'], [c.slope, 'Slope']].map(([v, l]) => (
                      <div key={String(l)} className="bg-canvas rounded-xl py-2 text-center">
                        <p className="font-display font-extrabold text-ink text-[14px] leading-none">{v}</p>
                        <p className="text-[10px] text-gray-500 font-semibold mt-1">{l}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <a href={`#/admin/courses/${c.id}`} className="flex-1 h-10 rounded-full bg-ink text-white text-[13px] font-bold font-display flex items-center justify-center gap-2 hover:bg-pine-900">
                      <IconPencil /> Edit
                    </a>
                    <button onClick={() => confirmDelete(c)} aria-label={`Delete ${c.name}`} title="Delete"
                      className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-100"><IconTrash /></button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ───────── Create / edit ───────── */

export function AdminCourseEditor({ id }: { id: string | null }) {
  useDataVersion()
  const { showToast } = useApp()
  const confirmDelete = useConfirmDeleteCourse()
  const existing = id ? MOCK_COURSES.find(c => c.id === id) : undefined

  if (id && !existing) {
    return (
      <div className="bg-white rounded-[32px] shadow-card">
        <EmptyState title="Course not found" subtitle="It may have been deleted."
          action={{ label: 'Back to courses', onClick: () => navigate('/admin/courses') }} />
      </div>
    )
  }

  const isNew = !existing
  const done = () => navigate('/admin/courses')

  return (
    <div className="page-in max-w-[920px]">
      <BackLink label="Courses" onClick={done} />
      <PageHeader
        eyebrow={isNew ? 'Create' : 'Edit'}
        title={isNew ? 'New course' : existing.name}
        actions={!isNew && (
          <button onClick={() => confirmDelete(existing, done)}
            className="h-11 px-4 rounded-full bg-rose-50 text-rose-600 text-[14px] font-bold font-display flex items-center gap-2 hover:bg-rose-100">
            <IconTrash /> Delete
          </button>
        )}
      />

      <CourseForm
        key={existing?.id ?? 'new'}
        formId="course-form"
        initial={existing}
        onSave={c => {
          upsertCourse(c)
          showToast(isNew ? `"${c.name}" added` : 'Course saved')
          done()
        }}
      />

      <div className="sticky bottom-4 mt-8 z-10">
        <div className="bg-ink rounded-full shadow-float p-2 pl-6 flex items-center gap-3">
          <p className="flex-1 text-[13px] font-medium text-white/60 truncate">
            {isNew ? 'The course becomes available when creating tournaments' : 'Tournaments at this course update automatically'}
          </p>
          <button type="button" onClick={done} className="h-11 px-5 rounded-full text-white/80 text-sm font-semibold font-display hover:bg-white/10">Cancel</button>
          <Button type="submit" form="course-form" className="bg-lime-400! text-ink! shadow-none!">
            {isNew ? 'Add course' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
