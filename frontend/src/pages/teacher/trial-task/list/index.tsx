import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Table, Typography } from 'antd';
import type { TableProps } from 'antd';
import { filter } from 'lodash-es';
import { useNavigate } from 'react-router-dom';
import {
  fetchTeacherTrialTasks,
  teacherTrialTasksQueryKey,
} from '../../../../api/session-participants';
import type { TeacherTrialTask } from '../../../../api/session-participants';
import { AppShell } from '../../../../components/app-shell';
import { TrialQueryBanner } from '../../../../components/trial-query-banner';
import { trialCaseStatusOptions } from '../../../../trial/labels';
import {
  emptyTrialQuery,
  isTrialQueryActive,
  matchesTrialQuery,
} from '../../../../trial/query';
import type { TrialQueryBannerValue } from '../../../../trial/query';
import styles from './index.module.css';

const teacherTrialTablePageSize = 10;

const melbourneDateTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Australia/Melbourne',
  dateStyle: 'medium',
  timeStyle: 'short',
});

const melbourneDate = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Australia/Melbourne',
  dateStyle: 'medium',
});

const melbourneTime = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Australia/Melbourne',
  timeStyle: 'short',
});

export function TeacherTrialTaskListPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState<TrialQueryBannerValue>(emptyTrialQuery);
  const [page, setPage] = useState(1);
  const tasksQuery = useQuery({
    queryKey: teacherTrialTasksQueryKey,
    queryFn: fetchTeacherTrialTasks,
  });
  const columns = useMemo(
    () =>
      createColumns((participantId) => {
        navigate(`/teacher/trial-task/${participantId}`);
      }),
    [navigate],
  );
  const filteredTasks = useMemo(() => {
    const tasks = tasksQuery.data ?? [];
    return filter(tasks, (task) =>
      matchesTrialQuery(
        {
          studentName: task.studentDisplayName,
          status: task.status,
        },
        query,
      ),
    );
  }, [query, tasksQuery.data]);

  return (
    <AppShell>
      <main className={styles.content}>
        <div className={styles.heading}>
          <Typography.Title className={styles.title} level={3}>
            试听跟踪
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            只显示你授课、课次已结束且尚未登记结果的试听。未满足这些条件时不能处理。
          </Typography.Paragraph>
        </div>
        <TrialQueryBanner
          statusOptions={trialCaseStatusOptions}
          value={query}
          onChange={(nextQuery) => {
            setQuery(nextQuery);
            setPage(1);
          }}
        />
        {tasksQuery.isError ? (
          <Alert showIcon type="error" title={tasksQuery.error.message} />
        ) : (
          <Table<TeacherTrialTask>
            columns={columns}
            dataSource={filteredTasks}
            loading={tasksQuery.isPending}
            locale={{
              emptyText: isTrialQueryActive(query)
                ? '没有符合条件的试听'
                : '暂无待处理的试听',
            }}
            pagination={{
              current: page,
              pageSize: teacherTrialTablePageSize,
              onChange: setPage,
            }}
            rowKey="id"
            scroll={{ x: 640 }}
          />
        )}
      </main>
    </AppShell>
  );
}

function createColumns(
  onProcess: (participantId: string) => void,
): TableProps<TeacherTrialTask>['columns'] {
  return [
    {
      title: '课程时间',
      key: 'sessionTime',
      render: (_value, record) => (
        <div className={styles.sessionTime}>
          <span>
            {formatSessionTime(record.session.startsAt, record.session.endsAt)}
          </span>
          <Typography.Text type="secondary">
            {record.session.className}
          </Typography.Text>
        </div>
      ),
    },
    {
      title: '学生',
      dataIndex: 'studentDisplayName',
      key: 'studentDisplayName',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value, record) => (
        <Button
          type="link"
          onClick={() => {
            onProcess(record.id);
          }}
        >
          处理
        </Button>
      ),
    },
  ];
}

function formatSessionTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (melbourneDate.format(start) === melbourneDate.format(end)) {
    return `${melbourneDateTime.format(start)} – ${melbourneTime.format(end)}`;
  }
  return `${melbourneDateTime.format(start)} – ${melbourneDateTime.format(end)}`;
}
