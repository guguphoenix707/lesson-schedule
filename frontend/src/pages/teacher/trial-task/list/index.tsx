import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Table, Tag, Tooltip, Typography } from 'antd';
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
import { formatSessionTime } from '../../../../trial/format-session-time';
import {
  derivedSessionLabels,
  trialCaseStatusLabels,
  trialCaseStatusOptions,
} from '../../../../trial/labels';
import {
  emptyTrialQuery,
  isTrialQueryActive,
  matchesTrialQuery,
} from '../../../../trial/query';
import type { TrialQueryBannerValue } from '../../../../trial/query';
import styles from './index.module.css';

const teacherTrialTablePageSize = 10;

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
            显示你授课、尚未登记结果的已安排试听。课次结束后才能处理。
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
                : '暂无已安排的试听',
            }}
            pagination={{
              current: page,
              pageSize: teacherTrialTablePageSize,
              onChange: setPage,
            }}
            rowKey="id"
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
      title: '状态',
      key: 'status',
      render: (_value, record) =>
        record.derivedSessionLabel ? (
          <Tag>{derivedSessionLabels[record.derivedSessionLabel]}</Tag>
        ) : (
          trialCaseStatusLabels[record.status]
        ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value, record) => (
        <ProcessAction
          canProcess={record.canProcess}
          onProcess={() => {
            onProcess(record.id);
          }}
        />
      ),
    },
  ];
}

function ProcessAction({
  canProcess,
  onProcess,
}: {
  canProcess: boolean;
  onProcess: () => void;
}) {
  return (
    <Tooltip title={canProcess ? null : '课次尚未结束，暂时不能处理'}>
      <span className={styles.processAction}>
        <Button
          disabled={!canProcess}
          type="link"
          onClick={onProcess}
        >
          处理
        </Button>
      </span>
    </Tooltip>
  );
}
