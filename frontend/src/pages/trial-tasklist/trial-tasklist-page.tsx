import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Drawer, Flex, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import { filter, map } from 'lodash-es';
import type { TrialAdminAction } from '../../api/students';
import {
  fetchTrialTasklist,
  trialTasklistQueryKey,
} from '../../api/trial-tasklist';
import type { TrialTasklistItem } from '../../api/trial-tasklist';
import { AppShell } from '../../components/app-shell';
import { StudentInfo } from '../../components/student-info';
import { TrialQueryBanner } from '../../components/trial-query-banner';
import {
  derivedSessionLabels,
  trialAdminActionLabels,
  trialCaseStatusColors,
  trialCaseStatusLabels,
  trialCaseStatusOptions,
} from '../../trial/labels';
import {
  emptyTrialQuery,
  isTrialQueryActive,
  matchesTrialQuery,
} from '../../trial/query';
import type { TrialQueryBannerValue } from '../../trial/query';
import styles from './trial-tasklist-page.module.css';

const trialTablePageSize = 10;

export function TrialTasklistPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState<TrialQueryBannerValue>(emptyTrialQuery);
  const [page, setPage] = useState(1);
  const tasklistQuery = useQuery({
    queryKey: trialTasklistQueryKey,
    queryFn: fetchTrialTasklist,
  });
  const columns = useMemo(
    () => createColumns(setSelectedStudentId),
    [],
  );
  const filteredItems = useMemo(() => {
    const items = tasklistQuery.data ?? [];
    return filter(items, (item) =>
      matchesTrialQuery(
        {
          studentName: item.student.displayName,
          status: item.status,
        },
        query,
      ),
    );
  }, [query, tasklistQuery.data]);

  return (
    <AppShell>
      <main className={styles.content}>
        <div className={styles.heading}>
          <Typography.Title className={styles.title} level={3}>
            待办中心
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            只显示与你关联的试听。学生姓名可打开卡片；操作按当前试听状态列出。
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
        {tasklistQuery.isError ? (
          <Alert showIcon type="error" title={tasklistQuery.error.message} />
        ) : (
          <Table<TrialTasklistItem>
            columns={columns}
            dataSource={filteredItems}
            loading={tasklistQuery.isPending}
            locale={{
              emptyText: isTrialQueryActive(query)
                ? '没有符合条件的试听'
                : '暂无负责的试听',
            }}
            pagination={{
              current: page,
              pageSize: trialTablePageSize,
              onChange: setPage,
            }}
            rowKey="id"
            scroll={{ x: 720 }}
          />
        )}
      </main>
      <Drawer
        destroyOnHidden
        open={selectedStudentId !== null}
        size="large"
        title="学生信息"
        closable={{ 'aria-label': '关闭' }}
        onClose={() => {
          setSelectedStudentId(null);
        }}
      >
        {selectedStudentId ? (
          <StudentInfo key={selectedStudentId} studentId={selectedStudentId} />
        ) : null}
      </Drawer>
    </AppShell>
  );
}

function createColumns(
  onOpenStudent: (studentId: string) => void,
): TableProps<TrialTasklistItem>['columns'] {
  return [
    {
      title: '学生',
      key: 'student',
      render: (_value, record) => (
        <Button
          className={styles.nameButton}
          type="link"
          onClick={() => {
            onOpenStudent(record.student.id);
          }}
        >
          {record.student.displayName}
        </Button>
      ),
    },
    {
      title: '试听状态',
      key: 'status',
      render: (_value, record) => (
        <Flex gap="small" align="center" wrap>
          <Tag color={trialCaseStatusColors[record.status]}>
            {trialCaseStatusLabels[record.status]}
          </Tag>
          {record.derivedSessionLabel ? (
            <Tag>{derivedSessionLabels[record.derivedSessionLabel]}</Tag>
          ) : null}
        </Flex>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value, record) => {
        if (record.allowedActions.length === 0) {
          return '—';
        }
        return (
          <Space size="small" wrap>
            {map(record.allowedActions, (action: TrialAdminAction) => (
              <Button
                key={action}
                danger={action === 'cancel'}
                type="link"
              >
                {trialAdminActionLabels[action]}
              </Button>
            ))}
          </Space>
        );
      },
    },
  ];
}
