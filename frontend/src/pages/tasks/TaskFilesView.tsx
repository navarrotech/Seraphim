// Copyright © 2026 Jalapeno Labs

// Core
import { useEffect, useMemo, useState } from 'react'

// Lib
import { DiffEditor } from '@monaco-editor/react'

// User interface
import { Button, Checkbox } from '@heroui/react'
import { Accordion } from '@frontend/common/Accordion'

// Misc
import {
  getMonacoFileLanguage,
  SERAPHIM_DARK_THEME,
  SERAPHIM_LIGHT_THEME,
} from '@frontend/framework/monaco'

type FileReviewStatus = 'modified' | 'added' | 'deleted'

type FileReview = {
  id: string
  path: string
  summary: string
  additions: number
  deletions: number
  status: FileReviewStatus
  originalContent: string
  modifiedContent: string
}

const mockFilesToReview: FileReview[] = [
  {
    id: 'task-view-tabs',
    path: 'frontend/src/pages/tasks/TaskView.tsx',
    summary: 'Center the tabs and clarify the task header content.',
    additions: 8,
    deletions: 2,
    status: 'modified',
    originalContent: `function TaskViewHeader() {
  return <div className="relaxed">
    <h2 className="text-2xl">Task</h2>
  </div>
}`,
    modifiedContent: `function TaskViewHeader() {
  return <div className="relaxed">
    <div className="h-1 w-12 rounded-full bg-sky-400/80" />
    <h2 className="text-2xl">
      <strong>Task</strong>
    </h2>
  </div>
}`,
  },
  {
    id: 'task-files-view',
    path: 'frontend/src/pages/tasks/TaskFilesView.tsx',
    summary: 'Switch to Monaco diff editor with inline mode support.',
    additions: 42,
    deletions: 18,
    status: 'modified',
    originalContent: `export function TaskFilesView() {
  return <Card>
    <p>Old diff view</p>
  </Card>
}`,
    modifiedContent: `export function TaskFilesView() {
  return <section className="relaxed">
    <DiffEditor
      original={oldContent}
      modified={newContent}
    />
  </section>
}`,
  },
  {
    id: 'accordion',
    path: 'frontend/src/common/Accordion.tsx',
    summary: 'Add a more polished accordion container shell.',
    additions: 18,
    deletions: 4,
    status: 'modified',
    originalContent: `export function Accordion(props: Props) {
  return <div className="border p-3">
    <button>{props.title}</button>
  </div>
}`,
    modifiedContent: `export function Accordion(props: Props) {
  return <div className="rounded-2xl border bg-white/70 p-3 shadow-sm">
    <button className="text-left">{props.title}</button>
  </div>
}`,
  },
]

const initialActiveFileId = mockFilesToReview[0]?.id || ''

type DiffViewMode = 'split' | 'inline'

function getFileStatusLabel(status: FileReviewStatus) {
  if (status === 'modified') {
    return 'Modified'
  }

  if (status === 'added') {
    return 'Added'
  }

  if (status === 'deleted') {
    return 'Deleted'
  }

  console.debug('TaskFilesView received an unsupported file status', { status })
  return 'Changed'
}

function getFileStatsLabel(file: FileReview) {
  return `+${file.additions} / -${file.deletions}`
}

function getFileSummaryLabel(file: FileReview) {
  return `${getFileStatusLabel(file.status)} - ${getFileStatsLabel(file)}`
}

function getFileExtension(pathname: string) {
  const fileName = pathname.split('/').pop()
  if (!fileName) {
    console.debug('TaskFilesView received a path without a filename', { pathname })
    return 'txt'
  }

  const pieces = fileName.split('.')
  if (pieces.length < 2) {
    console.debug('TaskFilesView received a path without an extension', { pathname })
    return 'txt'
  }

  return pieces[pieces.length - 1]
}

function getMonacoThemeFromDocument() {
  if (typeof document === 'undefined') {
    console.debug('TaskFilesView cannot resolve theme without document')
    return SERAPHIM_LIGHT_THEME
  }

  return document.documentElement.classList.contains('dark')
    ? SERAPHIM_DARK_THEME
    : SERAPHIM_LIGHT_THEME
}

export function TaskFilesView() {
  const [ viewedFileIds, setViewedFileIds ] = useState<string[]>([])
  const [ activeFileId, setActiveFileId ] = useState<string>(initialActiveFileId)
  const [ viewMode, setViewMode ] = useState<DiffViewMode>('split')
  const [ monacoTheme, setMonacoTheme ] = useState<string>(SERAPHIM_LIGHT_THEME)

  const visibleFiles = useMemo(() => {
    return mockFilesToReview.filter((file) => !viewedFileIds.includes(file.id))
  }, [ viewedFileIds ])

  useEffect(() => {
    if (mockFilesToReview.length === 0) {
      console.debug('TaskFilesView has no files to review')
    }
  }, [])

  useEffect(() => {
    const theme = getMonacoThemeFromDocument()
    setMonacoTheme(theme)

    if (typeof document === 'undefined') {
      return () => {}
    }

    const observer = new MutationObserver(() => {
      setMonacoTheme(getMonacoThemeFromDocument())
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: [ 'class' ],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (visibleFiles.length === 0) {
      if (activeFileId) {
        console.debug('TaskFilesView has no files left to review', { activeFileId })
        setActiveFileId('')
      }
      return
    }

    const hasActiveFile = visibleFiles.some((file) => file.id === activeFileId)
    if (!hasActiveFile) {
      setActiveFileId(visibleFiles[0].id)
    }
  }, [ activeFileId, visibleFiles ])

  function handleFileSelection(fileId: string) {
    setActiveFileId(fileId)
  }

  function handleViewedChange(fileId: string, isSelected: boolean) {
    if (!isSelected) {
      console.debug('TaskFilesView received an unview action', { fileId })
      setViewedFileIds((previousIds) => previousIds.filter((id) => id !== fileId))
      return
    }

    setViewedFileIds((previousIds) => {
      if (previousIds.includes(fileId)) {
        return previousIds
      }

      return [ ...previousIds, fileId ]
    })
  }

  function renderViewModeButton(mode: DiffViewMode, label: string) {
    const isActive = viewMode === mode

    return <Button
      key={mode}
      size='sm'
      variant={isActive ? 'solid' : 'light'}
      onPress={() => {
        setViewMode(mode)
      }}
    >
      <span>{label}</span>
    </Button>
  }

  function renderFileAccordion(file: FileReview) {
    const isActive = file.id === activeFileId
    const fileLanguage = getMonacoFileLanguage(
      getFileExtension(file.path),
    )

    return <Accordion
      key={file.id}
      title={file.path}
      subtitle={getFileSummaryLabel(file)}
      className={isActive
        ? 'ring-1 ring-amber-300/60 dark:ring-amber-400/40'
        : undefined
      }
      isOpen={isActive}
      onToggle={() => {
        handleFileSelection(file.id)
      }}
      actions={
        <Checkbox
          size='sm'
          color='success'
          onValueChange={(isSelected) => {
            handleViewedChange(file.id, isSelected)
          }}
        >
          Viewed
        </Checkbox>
      }
    >
      <div className='relaxed'>
        <p className='text-sm opacity-80'>{file.summary}</p>
        <div className='rounded-2xl border border-black/10 bg-gradient-to-br from-white/80 via-white/60
          to-amber-50/70 p-3 shadow-sm dark:border-white/10 dark:from-slate-900/70
          dark:via-slate-900/60 dark:to-slate-900/80'
        >
          <DiffEditor
            height='420px'
            original={file.originalContent}
            modified={file.modifiedContent}
            language={fileLanguage}
            theme={monacoTheme}
            options={{
              readOnly: true,
              renderSideBySide: viewMode === 'split',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              renderOverviewRuler: false,
            }}
          />
        </div>
      </div>
    </Accordion>
  }

  return <div className='flex min-h-0 flex-1 gap-6'>
    <aside className='w-full max-w-xs shrink-0'>
      <div className='relaxed rounded-2xl border border-black/10 bg-white/70 p-4 shadow-sm
        backdrop-blur dark:border-white/10 dark:bg-slate-900/70'
      >
        <div className='relaxed'>
          <div className='h-1 w-12 rounded-full bg-amber-400/80 dark:bg-amber-300/70' />
          <h3 className='text-lg'>
            <strong>Files to review</strong>
          </h3>
          <p className='opacity-70'>{
            `${visibleFiles.length} pending - ${mockFilesToReview.length} total`
          }</p>
          {viewedFileIds.length > 0 && (
            <p className='text-xs opacity-50'>{
              `Viewed hidden: ${viewedFileIds.length}`
            }</p>
          )}
        </div>
        <div className='relaxed'>
          {visibleFiles.length === 0 && (
            <div className='rounded-xl border border-black/10 bg-white/70 p-4 text-center
              dark:border-white/10 dark:bg-slate-900/70'
            >
              <p className='opacity-70'>All files reviewed.</p>
            </div>
          )}
          {visibleFiles.map((file) => {
            const isActive = file.id === activeFileId

            return <Button
              key={file.id}
              variant={isActive ? 'solid' : 'light'}
              className='w-full justify-start'
              onPress={() => {
                handleFileSelection(file.id)
              }}
            >
              <span className='truncate'>{file.path}</span>
            </Button>
          })}
        </div>
      </div>
    </aside>
    <section className='min-h-0 flex-1'>
      <div className='relaxed'>
        <div className='level'>
          <div>
            <div className='text-sm font-semibold'>Diff settings</div>
            <div className='text-xs opacity-60'>Switch between split and inline views.</div>
          </div>
          <div className='level-right'>
            {renderViewModeButton('split', 'Split')}
            {renderViewModeButton('inline', 'Inline')}
          </div>
        </div>
        {visibleFiles.length === 0 && (
          <div className='rounded-2xl border border-black/10 bg-white/70 p-6 text-center shadow-sm
            backdrop-blur dark:border-white/10 dark:bg-slate-900/70'
          >
            <p className='opacity-70'>No files to review right now.</p>
          </div>
        )}
        {visibleFiles.map(renderFileAccordion)}
      </div>
    </section>
  </div>
}
