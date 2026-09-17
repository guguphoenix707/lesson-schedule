import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Descriptions, Spin } from 'antd';
import type { DescriptionsProps } from 'antd';
import { fetchStudent, studentQueryKey } from '../api/students';
import type { StudentDetail } from '../api/students';
import {
  derivedSessionLabels,
  trialCaseStatusLabels,
} from '../trial/labels';
import styles from './student-info.module.css';

const melbourneDateTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Australia/Melbourne',
  dateStyle: 'medium',
  timeStyle: 'short',
});

type StudentInfoProps = {
  studentId: string;
};

export function StudentInfo({ studentId }: StudentInfoProps) {
  const [revealed, setRevealed] = useState(false);
  const studentQuery = useQuery({
    queryKey: studentQueryKey(studentId),
    queryFn: () => fetchStudent(studentId),
  });

  if (studentQuery.isPending) {
    return <Spin />;
  }

  if (studentQuery.isError) {
    return (
      <Alert
        showIcon
        type="error"
        title={studentQuery.error.message}
      />
    );
  }

  const student = studentQuery.data;
  const items = descriptionItems(student, revealed);

  return (
    <div>
      <Descriptions
        column={1}
        size="small"
        title={student.displayName}
        items={items}
      />
      {revealed ? null : (
        <div className={styles.actions}>
          <Button
            onClick={() => {
              setRevealed(true);
            }}
          >
            查看具体信息
          </Button>
        </div>
      )}
    </div>
  );
}

function descriptionItems(
  student: StudentDetail,
  revealed: boolean,
): DescriptionsProps['items'] {
  const { trial, primaryGuardian } = student;
  const statusText = trial
    ? trial.derivedSessionLabel
      ? `${trialCaseStatusLabels[trial.status]} · ${derivedSessionLabels[trial.derivedSessionLabel]}`
      : trialCaseStatusLabels[trial.status]
    : '无试听流程';

  return [
    {
      key: 'yearLevel',
      label: '年级',
      children: student.yearLevel,
    },
    {
      key: 'school',
      label: '学校',
      children: student.currentSchool ?? '—',
    },
    {
      key: 'status',
      label: '试听状态',
      children: statusText,
    },
    {
      key: 'course',
      label: '试听课程',
      children: trial?.requestedCourse
        ? `${trial.requestedCourse.name} / ${trial.requestedCourse.nameEn}`
        : '—',
    },
    {
      key: 'campus',
      label: '意向校区',
      children: trial?.preferredCampus
        ? `${trial.preferredCampus.nameZh} / ${trial.preferredCampus.name}`
        : '—',
    },
    {
      key: 'session',
      label: '当前课次',
      children: trial?.currentSession
        ? `${trial.currentSession.className} · ${trial.currentSession.teacherName} · ${melbourneDateTime.format(new Date(trial.currentSession.startsAt))}`
        : '—',
    },
    {
      key: 'phone',
      label: '学生电话',
      children: formatContact(student.phone, revealed),
    },
    {
      key: 'email',
      label: '学生邮箱',
      children: formatContact(student.email, revealed),
    },
    {
      key: 'guardian',
      label: '家长',
      children: primaryGuardian?.displayName ?? '—',
    },
    {
      key: 'guardianPhone',
      label: '家长电话',
      children: formatContact(primaryGuardian?.phone ?? null, revealed),
    },
    {
      key: 'guardianEmail',
      label: '家长邮箱',
      children: formatContact(primaryGuardian?.email ?? null, revealed),
    },
    {
      key: 'concerns',
      label: '试听诉求',
      children: revealed ? trial?.concerns || '—' : maskText(trial?.concerns),
    },
    {
      key: 'notes',
      label: '备注',
      children: revealed ? student.notes || '—' : maskText(student.notes),
    },
    {
      key: 'closedReason',
      label: '关闭原因',
      children: trial?.closedReason ?? '—',
    },
  ];
}

function formatContact(value: string | null, revealed: boolean): string {
  if (!value) {
    return '—';
  }
  return revealed ? value : maskSecret(value);
}

function maskSecret(value: string): string {
  if (value.includes('@')) {
    const [local, domain] = value.split('@');
    if (!domain) {
      return '****';
    }
    const prefix = local.slice(0, 1) || '*';
    return `${prefix}***@${domain}`;
  }
  if (value.length <= 4) {
    return '****';
  }
  return `${value.slice(0, 4)}****${value.slice(-2)}`;
}

function maskText(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  return '已隐藏，点击查看具体信息';
}
