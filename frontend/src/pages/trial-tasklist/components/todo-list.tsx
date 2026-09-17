import { Card, Flex, Statistic } from 'antd';
import { map, reduce } from 'lodash-es';
import type { TrialTasklistItem } from '../../../api/trial-tasklist';
import styles from './todo-list.module.css';

type TodoListProps = {
  items: TrialTasklistItem[] | undefined;
  loading?: boolean;
};

type TodoMetric = {
  key: 'pendingSchedule' | 'pendingFollowup' | 'scheduled' | 'interested';
  label: string;
  value: number;
  cardClassName: string;
};

export function TodoList({ items, loading = false }: TodoListProps) {
  const summary = summarizeTodos(items ?? []);
  const metrics: TodoMetric[] = [
    {
      key: 'pendingSchedule',
      label: '待安排',
      value: summary.pendingSchedule,
      cardClassName: styles.pendingSchedule,
    },
    {
      key: 'pendingFollowup',
      label: '待跟进',
      value: summary.pendingFollowup,
      cardClassName: styles.pendingFollowup,
    },
    {
      key: 'scheduled',
      label: '已预约',
      value: summary.scheduled,
      cardClassName: styles.scheduled,
    },
    {
      key: 'interested',
      label: '待办理报名',
      value: summary.interested,
      cardClassName: styles.interested,
    },
  ];

  return (
    <Flex className={styles.root} gap="small" wrap>
      {map(metrics, (metric) => (
        <Card
          key={metric.key}
          classNames={{
            root: `${styles.card} ${metric.cardClassName}`,
            body: styles.cardBody,
          }}
          size="small"
        >
          <Statistic
            classNames={{
              root: styles.stat,
              header: styles.statHeader,
              title: styles.statTitle,
              value: styles.statValue,
            }}
            loading={loading}
            title={metric.label}
            value={metric.value}
          />
        </Card>
      ))}
    </Flex>
  );
}

type TodoSummary = {
  pendingSchedule: number;
  pendingFollowup: number;
  scheduled: number;
  interested: number;
};

function summarizeTodos(items: TrialTasklistItem[]): TodoSummary {
  const now = Date.now();
  return reduce(
    items,
    (summary, item) => {
      if (item.status === 'pending_schedule') {
        summary.pendingSchedule += 1;
      }
      if (item.status === 'scheduled') {
        summary.scheduled += 1;
      }
      if (item.status === 'interested') {
        summary.interested += 1;
      }
      if (isDueFollowup(item, now)) {
        summary.pendingFollowup += 1;
      }
      return summary;
    },
    {
      pendingSchedule: 0,
      pendingFollowup: 0,
      scheduled: 0,
      interested: 0,
    },
  );
}

function isDueFollowup(item: TrialTasklistItem, now: number): boolean {
  if (item.status === 'pending_followup') {
    return true;
  }
  if (item.status !== 'following_up' || !item.nextFollowupAt) {
    return false;
  }
  return new Date(item.nextFollowupAt).getTime() <= now;
}
