import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Flex, Select, Table, Typography } from 'antd';
import type { TableProps } from 'antd';
import { filter, map, uniqBy } from 'lodash-es';
import {
  fetchSchedulableSessions,
  scheduleTrialCase,
  schedulableSessionsQueryKey,
} from '../../../api/trial-cases';
import type { SchedulableSession } from '../../../api/trial-cases';
import { trialTasklistQueryKey } from '../../../api/trial-tasklist';
import { history } from '../../../routes/history';
import {
  formatSessionDate,
  formatSessionTime,
  sessionDateKey,
} from '../../../trial/format-session-time';
import styles from './schedule-trial-panel.module.css';

type ScheduleTrialPanelProps = {
  trialCaseId: string;
};

export function ScheduleTrialPanel({ trialCaseId }: ScheduleTrialPanelProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [courseId, setCourseId] = useState<string>();
  const [teacherId, setTeacherId] = useState<string>();
  const [dateKey, setDateKey] = useState<string>();
  const [sessionId, setSessionId] = useState<string>();
  const sessionsQuery = useQuery({
    queryKey: schedulableSessionsQueryKey(trialCaseId),
    queryFn: () => fetchSchedulableSessions(trialCaseId),
  });
  const scheduleMutation = useMutation({
    mutationFn: () => {
      if (!sessionId) {
        throw new Error('请选择课次');
      }
      return scheduleTrialCase(trialCaseId, sessionId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: trialTasklistQueryKey });
      message.success('已安排试听');
      history.goBack();
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
  const sessions = useMemo(
    () => sessionsQuery.data?.items ?? [],
    [sessionsQuery.data],
  );
  const courseOptions = useMemo(
    () =>
      map(uniqBy(sessions, (session) => session.course.id), (session) => ({
        value: session.course.id,
        label: session.course.name,
      })),
    [sessions],
  );
  const teacherOptions = useMemo(
    () =>
      map(uniqBy(sessions, (session) => session.teacher.id), (session) => ({
        value: session.teacher.id,
        label: session.teacher.displayName,
      })),
    [sessions],
  );
  const dateOptions = useMemo(
    () =>
      map(
        uniqBy(sessions, (session) => sessionDateKey(session.startsAt)),
        (session) => ({
          value: sessionDateKey(session.startsAt),
          label: formatSessionDate(session.startsAt),
        }),
      ),
    [sessions],
  );
  const filteredSessions = useMemo(
    () =>
      filter(sessions, (session) => {
        if (courseId && session.course.id !== courseId) {
          return false;
        }
        if (teacherId && session.teacher.id !== teacherId) {
          return false;
        }
        if (dateKey && sessionDateKey(session.startsAt) !== dateKey) {
          return false;
        }
        return true;
      }),
    [courseId, dateKey, sessions, teacherId],
  );
  const columns = useMemo(() => createSessionColumns(), []);

  if (sessionsQuery.isError) {
    return (
      <Alert showIcon type="error" title={sessionsQuery.error.message} />
    );
  }

  return (
    <>
      <Flex className={styles.filters} gap="small" wrap>
        <Select
          allowClear
          className={styles.filter}
          options={courseOptions}
          placeholder="全部课程"
          value={courseId}
          onChange={(value: string | undefined) => {
            setCourseId(value);
            setSessionId(undefined);
          }}
        />
        <Select
          allowClear
          className={styles.filter}
          options={teacherOptions}
          placeholder="全部教师"
          value={teacherId}
          onChange={(value: string | undefined) => {
            setTeacherId(value);
            setSessionId(undefined);
          }}
        />
        <Select
          allowClear
          className={styles.filter}
          options={dateOptions}
          placeholder="全部日期"
          value={dateKey}
          onChange={(value: string | undefined) => {
            setDateKey(value);
            setSessionId(undefined);
          }}
        />
      </Flex>
      <Table<SchedulableSession>
        columns={columns}
        dataSource={filteredSessions}
        loading={sessionsQuery.isPending}
        locale={{ emptyText: '没有可安排的课次' }}
        pagination={false}
        rowKey="id"
        rowSelection={{
          type: 'radio',
          selectedRowKeys: sessionId ? [sessionId] : [],
          onChange: (keys) => {
            const [nextSessionId] = keys;
            setSessionId(
              typeof nextSessionId === 'string' ? nextSessionId : undefined,
            );
          },
        }}
        scroll={{ x: 640, y: 320 }}
        size="small"
        onRow={(record) => ({
          onClick: () => {
            setSessionId(record.id);
          },
        })}
      />
      <Typography.Paragraph className={styles.hint} type="secondary">
        只能选择尚未开始且未取消的已有课次。
      </Typography.Paragraph>
      <Flex className={styles.actions} justify="flex-end">
        <Button
          disabled={!sessionId}
          loading={scheduleMutation.isPending}
          type="primary"
          onClick={() => {
            if (!sessionId) {
              message.warning('请选择课次');
              return;
            }
            scheduleMutation.mutate();
          }}
        >
          确认安排
        </Button>
      </Flex>
    </>
  );
}

function createSessionColumns(): TableProps<SchedulableSession>['columns'] {
  return [
    {
      title: '时间',
      key: 'time',
      render: (_value, record) =>
        formatSessionTime(record.startsAt, record.endsAt),
    },
    {
      title: '课程',
      key: 'course',
      render: (_value, record) => (
        <div>
          <div>{record.course.name}</div>
          <Typography.Text type="secondary">{record.className}</Typography.Text>
        </div>
      ),
    },
    {
      title: '教师',
      dataIndex: ['teacher', 'displayName'],
      key: 'teacher',
    },
  ];
}
