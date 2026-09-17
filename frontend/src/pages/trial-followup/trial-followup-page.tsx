import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Descriptions,
  Flex,
  Input,
  Space,
  Spin,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import type { DescriptionsProps } from 'antd';
import { map } from 'lodash-es';
import { useParams } from 'react-router-dom';
import {
  fetchTrialFollowup,
  generateTrialFollowupDraft,
  saveTrialFollowupDraft,
  trialFollowupQueryKey,
} from '../../api/trial-cases';
import type { TrialFollowupDetail } from '../../api/trial-cases';
import type { TrialCaseStatus } from '../../api/students';
import { AppShell } from '../../components/app-shell';
import { StudentInfo } from '../../components/student-info';
import { history } from '../../routes/history';
import {
  formatMelbourneDateTime,
  formatSessionTime,
} from '../../trial/format-session-time';
import {
  followUpOutcomeLabels,
  trialCaseStatusColors,
  trialCaseStatusLabels,
} from '../../trial/labels';
import { FollowUpResultModal } from './components/follow-up-result-modal';
import styles from './trial-followup-page.module.css';

export function TrialFollowupPage() {
  const { trialID } = useParams<{ trialID: string }>();
  const followupQuery = useQuery({
    queryKey: trialFollowupQueryKey(trialID ?? ''),
    queryFn: () => fetchTrialFollowup(trialID ?? ''),
    enabled: Boolean(trialID),
  });

  return (
    <AppShell>
      <main className={styles.content}>
        <div className={styles.heading}>
          <Typography.Title className={styles.title} level={3}>
            试听跟踪
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            查看教师反馈和历史跟进，可生成 AI 草稿后修改保存，再提交跟进结果。生成或保存草稿都不会推进试听状态。
          </Typography.Paragraph>
        </div>
        {!trialID ? (
          <Alert showIcon type="error" title="缺少试听编号" />
        ) : followupQuery.isPending ? (
          <Spin size="large" />
        ) : followupQuery.isError ? (
          <Space orientation="vertical" size="medium">
            <Alert showIcon type="error" title={followupQuery.error.message} />
            <Button
              htmlType="button"
              onClick={() => {
                history.push('/trial-tasklist');
              }}
            >
              返回待办中心
            </Button>
          </Space>
        ) : (
          <TrialFollowupBody
            key={followupQuery.data.id}
            followup={followupQuery.data}
            trialID={trialID}
          />
        )}
      </main>
    </AppShell>
  );
}

function TrialFollowupBody({
  followup,
  trialID,
}: {
  followup: TrialFollowupDetail;
  trialID: string;
}) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(followup.followupDraft ?? '');
  const [resultOpen, setResultOpen] = useState(false);
  const canFollowUp = isFollowupStatus(followup.status);
  const draftMutation = useMutation({
    mutationFn: () => saveTrialFollowupDraft(trialID, draft),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: trialFollowupQueryKey(trialID),
      });
      message.success('草稿已保存，试听状态未改变');
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
  const generateMutation = useMutation({
    mutationFn: () => generateTrialFollowupDraft(trialID),
    onSuccess: (followupDraft) => {
      setDraft(followupDraft);
      message.success('已生成草稿，可修改后保存；试听状态未改变');
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });
  const draftBusy = draftMutation.isPending || generateMutation.isPending;

  return (
    <>
      <Flex className={styles.statusRow} align="center" gap="small" wrap>
        <Tag color={trialCaseStatusColors[followup.status]}>
          {trialCaseStatusLabels[followup.status]}
        </Tag>
        {followup.nextFollowupAt ? (
          <Typography.Text type="secondary">
            下次跟进：{formatMelbourneDateTime(followup.nextFollowupAt)}
          </Typography.Text>
        ) : null}
      </Flex>
      {statusNotice(followup)}
      <Flex gap="large" align="flex-start" wrap>
        <section className={styles.studentPane}>
          <StudentInfo key={followup.student.id} studentId={followup.student.id} />
        </section>
        <section className={styles.mainPane}>
          <div className={styles.section}>
            <Typography.Title className={styles.sectionTitle} level={5}>
              沟通草稿
            </Typography.Title>
            <Input.TextArea
              autoSize={{ minRows: 6 }}
              disabled={!canFollowUp || draftBusy}
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
              }}
            />
            {canFollowUp ? (
              <Flex
                className={styles.sectionActions}
                gap="small"
                justify="flex-end"
                wrap
              >
                <Button
                  htmlType="button"
                  loading={generateMutation.isPending}
                  disabled={draftMutation.isPending}
                  onClick={() => {
                    generateMutation.mutate();
                  }}
                >
                  生成AI草稿
                </Button>
                <Button
                  htmlType="button"
                  loading={draftMutation.isPending}
                  disabled={generateMutation.isPending}
                  onClick={() => {
                    draftMutation.mutate();
                  }}
                >
                  保存草稿
                </Button>
              </Flex>
            ) : null}
          </div>
          <div className={styles.section}>
            <Typography.Title className={styles.sectionTitle} level={5}>
              教师反馈
            </Typography.Title>
            {followup.teacherFeedback ? (
              <Descriptions
                column={1}
                size="small"
                items={teacherFeedbackItems(followup.teacherFeedback)}
              />
            ) : (
              <Typography.Text type="secondary">暂无教师反馈</Typography.Text>
            )}
          </div>
          <div className={styles.section}>
            <Typography.Title className={styles.sectionTitle} level={5}>
              历史跟进记录
            </Typography.Title>
            {followup.followUps.length === 0 ? (
              <Typography.Text type="secondary">暂无跟进记录</Typography.Text>
            ) : (
              <Timeline
                items={map(followup.followUps, (record) => ({
                  content: (
                    <div className={styles.historyItem}>
                      <Typography.Text strong>
                        {followUpOutcomeLabels[record.outcome]}
                      </Typography.Text>
                      {record.summary ? (
                        <Typography.Paragraph className={styles.historySummary}>
                          {record.summary}
                        </Typography.Paragraph>
                      ) : null}
                      {record.nextFollowupAt ? (
                        <Typography.Text type="secondary">
                          当时约定下次跟进：
                          {formatMelbourneDateTime(record.nextFollowupAt)}
                        </Typography.Text>
                      ) : null}
                      <Typography.Text type="secondary">
                        {record.authorName} ·{' '}
                        {formatMelbourneDateTime(record.createdAt)}
                      </Typography.Text>
                    </div>
                  ),
                }))}
              />
            )}
          </div>
          {followup.closedReason ? (
            <Alert
              showIcon
              type="info"
              title={`关闭原因：${followup.closedReason}`}
            />
          ) : null}
          <Flex className={styles.pageActions} gap="small" wrap>
            {canFollowUp ? (
              <Button
                type="primary"
                onClick={() => {
                  setResultOpen(true);
                }}
              >
                提交跟进结果
              </Button>
            ) : null}
            <Button
              htmlType="button"
              onClick={() => {
                history.push('/trial-tasklist');
              }}
            >
              返回待办中心
            </Button>
          </Flex>
        </section>
      </Flex>
      <FollowUpResultModal
        open={resultOpen}
        trialCaseId={trialID}
        onClose={() => {
          setResultOpen(false);
        }}
      />
    </>
  );
}

function isFollowupStatus(status: TrialCaseStatus): boolean {
  return status === 'pending_followup' || status === 'following_up';
}

function statusNotice(followup: TrialFollowupDetail) {
  if (followup.status === 'interested') {
    return (
      <Alert
        className={styles.notice}
        showIcon
        type="success"
        title="已标记待办理报名。后续正式报名办理本期不实现。"
      />
    );
  }
  if (followup.status === 'closed') {
    return (
      <Alert
        className={styles.notice}
        showIcon
        type="info"
        title="该试听流程已结束，只能查看历史记录。"
      />
    );
  }
  if (!isFollowupStatus(followup.status)) {
    return (
      <Alert
        className={styles.notice}
        showIcon
        type="warning"
        title="当前不是跟进阶段，不能生成或保存草稿，也不能提交跟进结果。"
      />
    );
  }
  return null;
}

function teacherFeedbackItems(
  feedback: NonNullable<TrialFollowupDetail['teacherFeedback']>,
): DescriptionsProps['items'] {
  return [
    {
      key: 'session',
      label: '试听课次',
      children: `${feedback.session.className} · ${feedback.session.teacherName} · ${formatSessionTime(feedback.session.startsAt, feedback.session.endsAt)}`,
    },
    {
      key: 'performance',
      label: '表现评价',
      children: feedback.performance,
    },
    {
      key: 'fitSuggestion',
      label: '适配建议',
      children: feedback.fitSuggestion,
    },
    {
      key: 'questionsForAdmin',
      label: '需顾问确认的问题',
      children: feedback.questionsForAdmin ?? '—',
    },
  ];
}
