import { useQuery } from '@tanstack/react-query';
import { Alert, Flex, Spin, Typography } from 'antd';
import { useParams } from 'react-router-dom';
import {
  fetchSchedulableSessions,
  schedulableSessionsQueryKey,
} from '../../api/trial-cases';
import { AppShell } from '../../components/app-shell';
import { StudentInfo } from '../../components/student-info';
import { ScheduleTrialPanel } from './components/schedule-trial-panel';
import styles from './schedule-trial-page.module.css';

export function ScheduleTrialPage() {
  const { trialID } = useParams<{ trialID: string }>();
  const sessionsQuery = useQuery({
    queryKey: schedulableSessionsQueryKey(trialID ?? ''),
    queryFn: () => fetchSchedulableSessions(trialID ?? ''),
    enabled: Boolean(trialID),
  });
  const studentId = sessionsQuery.data?.student.id;

  return (
    <AppShell>
      <main className={styles.content}>
        <div className={styles.heading}>
          <Typography.Title className={styles.title} level={3}>
            安排试听
          </Typography.Title>
        </div>
        {!trialID ? (
          <Alert showIcon type="error" title="缺少试听编号" />
        ) : (
          <Flex gap="large" align="flex-start" wrap>
            <section className={styles.studentPane}>
              {sessionsQuery.isError ? (
                <Alert
                  showIcon
                  type="error"
                  title={sessionsQuery.error.message}
                />
              ) : studentId ? (
                <StudentInfo key={studentId} studentId={studentId} />
              ) : (
                <Spin />
              )}
            </section>
            <section className={styles.schedulePane}>
              <ScheduleTrialPanel trialCaseId={trialID} />
            </section>
          </Flex>
        )}
      </main>
    </AppShell>
  );
}
