import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Drawer, Flex, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';
import { map } from 'lodash-es';
import { fetchStudents, studentsQueryKey } from '../../api/students';
import type { StudentListItem, TrialAdminAction } from '../../api/students';
import { AppShell } from '../../components/app-shell';
import { StudentInfo } from '../../components/student-info';
import {
  derivedSessionLabels,
  trialAdminActionLabels,
  trialCaseStatusColors,
  trialCaseStatusLabels,
} from '../../trial/labels';
import styles from './trial-tasklist-page.module.css';

export function TrialTasklistPage() {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    null,
  );
  const studentsQuery = useQuery({
    queryKey: studentsQueryKey,
    queryFn: fetchStudents,
  });
  const columns = useMemo(
    () => createColumns(setSelectedStudentId),
    [],
  );

  return (
    <AppShell>
      <main className={styles.content}>
        <div className={styles.heading}>
          <Typography.Title className={styles.title} level={3}>
            待办中心
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            只显示你负责的试听学生。学生姓名可打开卡片；操作按当前试听状态列出。
          </Typography.Paragraph>
        </div>
        {studentsQuery.isError ? (
          <Alert showIcon type="error" title={studentsQuery.error.message} />
        ) : (
          <Table<StudentListItem>
            columns={columns}
            dataSource={studentsQuery.data}
            loading={studentsQuery.isPending}
            locale={{ emptyText: '暂无负责的试听学生' }}
            pagination={false}
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
): TableProps<StudentListItem>['columns'] {
  return [
    {
      title: '学生',
      dataIndex: 'displayName',
      key: 'displayName',
      render: (displayName: string, record) => (
        <Button
          className={styles.nameButton}
          type="link"
          onClick={() => {
            onOpenStudent(record.id);
          }}
        >
          {displayName}
        </Button>
      ),
    },
    {
      title: '试听状态',
      key: 'status',
      render: (_value, record) => {
        const { trialCase } = record;
        if (!trialCase) {
          return '—';
        }
        return (
          <Flex gap="small" align="center" wrap>
            <Tag color={trialCaseStatusColors[trialCase.status]}>
              {trialCaseStatusLabels[trialCase.status]}
            </Tag>
            {trialCase.derivedSessionLabel ? (
              <Tag>{derivedSessionLabels[trialCase.derivedSessionLabel]}</Tag>
            ) : null}
          </Flex>
        );
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (_value, record) => {
        const actions = record.trialCase?.allowedActions ?? [];
        if (actions.length === 0) {
          return '—';
        }
        return (
          <Space size="small" wrap>
            {map(actions, (action: TrialAdminAction) => (
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
