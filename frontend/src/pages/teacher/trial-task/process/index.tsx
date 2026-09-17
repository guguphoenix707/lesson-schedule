import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Alert, Button, Form, Input, Radio, Space, Spin, Typography } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import {
  fetchTeacherTrialTask,
  recordTeacherTrialAttendance,
  teacherTrialTaskQueryKey,
  teacherTrialTasksQueryKey,
} from '../../../../api/session-participants';
import type { TeacherTrialAttendanceInput } from '../../../../api/session-participants';
import { homePathFor } from '../../../../auth/home-path';
import { AppShell } from '../../../../components/app-shell';
import styles from './index.module.css';

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

const attendanceOptions = [
  { label: '已到课', value: 'present' },
  { label: '未到课', value: 'absent' },
];

type ProcessFormValues = {
  attendance?: 'present' | 'absent';
  performance?: string;
  fitSuggestion?: string;
  questionsForAdmin?: string;
  absentNote?: string;
};

export function TeacherTrialProcessPage() {
  const { participantId } = useParams<{ participantId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<ProcessFormValues>();
  const attendance = Form.useWatch('attendance', form);
  const taskQuery = useQuery({
    queryKey: teacherTrialTaskQueryKey(participantId ?? ''),
    queryFn: () => fetchTeacherTrialTask(participantId ?? ''),
    enabled: Boolean(participantId),
  });
  const recordMutation = useMutation({
    mutationFn: (input: TeacherTrialAttendanceInput) => {
      if (!participantId) {
        throw new Error('缺少试听记录');
      }
      return recordTeacherTrialAttendance(participantId, input);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: teacherTrialTasksQueryKey,
      });
      message.success('已登记试听结果');
      navigate(homePathFor('teacher'), { replace: true });
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  return (
    <AppShell>
      <main className={styles.content}>
        <div className={styles.heading}>
          <Typography.Title className={styles.title} level={3}>
            试听处理
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            登记到课结果。已到课请填写课程是否适合及观察依据；未到课说明可选。
          </Typography.Paragraph>
        </div>
        {taskQuery.isPending ? (
          <Spin size="large" />
        ) : taskQuery.isError ? (
          <Space orientation="vertical" size="medium">
            <Alert showIcon type="error" title={taskQuery.error.message} />
            <Button
              htmlType="button"
              onClick={() => {
                navigate(homePathFor('teacher'));
              }}
            >
              返回列表
            </Button>
          </Space>
        ) : (
          <>
            <div className={styles.summary}>
              <Typography.Text>
                学生：{taskQuery.data.studentDisplayName}
              </Typography.Text>
              <Typography.Text>
                课程时间：
                {formatSessionTime(
                  taskQuery.data.session.startsAt,
                  taskQuery.data.session.endsAt,
                )}
              </Typography.Text>
              <Typography.Text type="secondary">
                {taskQuery.data.session.className}
              </Typography.Text>
            </div>
            <Form<ProcessFormValues>
              disabled={recordMutation.isPending}
              form={form}
              layout="vertical"
              scrollToFirstError={{ focus: true }}
              onFinish={(values) => {
                recordMutation.mutate(toAttendanceInput(values));
              }}
            >
              <Form.Item
                label="到课情况"
                name="attendance"
                rules={[{ required: true, message: '请选择已到课或未到课' }]}
              >
                <Radio.Group
                  block
                  optionType="button"
                  options={attendanceOptions}
                />
              </Form.Item>
              {attendance === 'present' ? (
                <>
                  <Form.Item
                    extra="写下课堂上的具体观察。"
                    label="表现评价"
                    name="performance"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: '请填写表现评价',
                      },
                    ]}
                  >
                    <Input.TextArea autoSize={{ minRows: 3 }} />
                  </Form.Item>
                  <Form.Item
                    extra="请说明当前课程是否适合，以及观察依据。"
                    label="适配建议"
                    name="fitSuggestion"
                    rules={[
                      {
                        required: true,
                        whitespace: true,
                        message: '请填写适配建议',
                      },
                    ]}
                  >
                    <Input.TextArea autoSize={{ minRows: 3 }} />
                  </Form.Item>
                  <Form.Item
                    extra="选填"
                    label="需顾问确认的问题"
                    name="questionsForAdmin"
                  >
                    <Input.TextArea autoSize={{ minRows: 2 }} />
                  </Form.Item>
                </>
              ) : null}
              {attendance === 'absent' ? (
                <Form.Item extra="选填" label="说明" name="absentNote">
                  <Input.TextArea autoSize={{ minRows: 2 }} />
                </Form.Item>
              ) : null}
              <Form.Item className={styles.actions}>
                <Space wrap>
                  <Button
                    htmlType="submit"
                    loading={recordMutation.isPending}
                    type="primary"
                  >
                    提交
                  </Button>
                  <Button
                    htmlType="button"
                    onClick={() => {
                      navigate(homePathFor('teacher'));
                    }}
                  >
                    返回列表
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </>
        )}
      </main>
    </AppShell>
  );
}

function toAttendanceInput(values: ProcessFormValues): TeacherTrialAttendanceInput {
  if (values.attendance === 'present') {
    const questionsForAdmin = values.questionsForAdmin?.trim();
    return {
      attendance: 'present',
      teacherFeedback: {
        performance: values.performance?.trim() ?? '',
        fitSuggestion: values.fitSuggestion?.trim() ?? '',
        ...(questionsForAdmin ? { questionsForAdmin } : {}),
      },
    };
  }

  const absentNote = values.absentNote?.trim();
  return {
    attendance: 'absent',
    ...(absentNote ? { teacherFeedback: { absentNote } } : {}),
  };
}

function formatSessionTime(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (melbourneDate.format(start) === melbourneDate.format(end)) {
    return `${melbourneDateTime.format(start)} – ${melbourneTime.format(end)}`;
  }
  return `${melbourneDateTime.format(start)} – ${melbourneDateTime.format(end)}`;
}
