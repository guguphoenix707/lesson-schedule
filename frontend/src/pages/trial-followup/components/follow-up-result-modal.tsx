import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Form, Input, Modal, Radio } from 'antd';
import {
  createTrialFollowUp,
  trialFollowupQueryKey,
} from '../../../api/trial-cases';
import type {
  CreateFollowUpInput,
  FollowUpOutcome,
} from '../../../api/trial-cases';
import { trialTasklistQueryKey } from '../../../api/trial-tasklist';
import { followUpOutcomeOptions } from '../../../trial/labels';
import {
  defaultNextFollowupLocalValue,
  melbourneDateTimeLocalToIso,
  melbourneNowLocalValue,
} from '../../../trial/melbourne-time';
import styles from './follow-up-result-modal.module.css';

type FollowUpFormValues = {
  outcome?: FollowUpOutcome;
  summary?: string;
  closedReason?: string;
  nextFollowupAt?: string;
};

type FollowUpResultModalProps = {
  trialCaseId: string;
  open: boolean;
  onClose: () => void;
};

export function FollowUpResultModal({
  trialCaseId,
  open,
  onClose,
}: FollowUpResultModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FollowUpFormValues>();
  const outcome = Form.useWatch('outcome', form);
  const needsNextTime =
    outcome === 'unreachable' || outcome === 'considering';
  const needsSummary =
    outcome === 'considering' ||
    outcome === 'interested' ||
    outcome === 'not_interested';
  const createMutation = useMutation({
    mutationFn: (input: CreateFollowUpInput) =>
      createTrialFollowUp(trialCaseId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: trialFollowupQueryKey(trialCaseId),
        }),
        queryClient.invalidateQueries({ queryKey: trialTasklistQueryKey }),
        queryClient.invalidateQueries({ queryKey: ['students'] }),
      ]);
      message.success('已记录跟进结果');
      onClose();
    },
    onError: (error: Error) => {
      message.error(error.message);
    },
  });

  return (
    <Modal
      cancelText="取消"
      confirmLoading={createMutation.isPending}
      destroyOnHidden
      okButtonProps={{ htmlType: 'submit' }}
      okText={submitLabel(outcome)}
      open={open}
      title="记录跟进结果"
      onCancel={onClose}
      modalRender={(dom) => (
        <Form<FollowUpFormValues>
          clearOnDestroy
          disabled={createMutation.isPending}
          form={form}
          initialValues={{
            nextFollowupAt: defaultNextFollowupLocalValue(),
          }}
          layout="vertical"
          name="follow-up-result"
          preserve={false}
          scrollToFirstError={{ focus: true }}
          onFinish={(values) => {
            const input = toCreateInput(values);
            if (!input) {
              message.error('请完整填写跟进结果');
              return;
            }
            createMutation.mutate(input);
          }}
        >
          {dom}
        </Form>
      )}
    >
      <Form.Item
        label="跟进结果"
        name="outcome"
        rules={[{ required: true, message: '请选择跟进结果' }]}
      >
        <Radio.Group options={followUpOutcomeOptions} vertical />
      </Form.Item>
      {needsSummary ? (
        <Form.Item
          extra={summaryExtra(outcome)}
          label="沟通摘要"
          name="summary"
          rules={[
            { required: true, whitespace: true, message: '请填写沟通摘要' },
          ]}
        >
          <Input.TextArea autoSize={{ minRows: 3 }} />
        </Form.Item>
      ) : null}
      {outcome === 'not_interested' ? (
        <Form.Item
          extra="提交后将结束该试听流程，不能从界面任意恢复。"
          label="关闭原因"
          name="closedReason"
          rules={[
            { required: true, whitespace: true, message: '请填写关闭原因' },
          ]}
        >
          <Input.TextArea autoSize={{ minRows: 2 }} />
        </Form.Item>
      ) : null}
      {needsNextTime ? (
        <Form.Item
          extra="按墨尔本时间填写。未联系上或家长考虑中必须是未来时间，默认次日 10:00。"
          label="下次跟进时间"
          name="nextFollowupAt"
          rules={[
            { required: true, message: '请选择下次跟进时间' },
            {
              validator: async (_, value: string | undefined) => {
                await validateFutureMelbourneTime(value);
              },
            },
          ]}
        >
          <Input
            className={styles.dateTime}
            min={melbourneNowLocalValue()}
            type="datetime-local"
          />
        </Form.Item>
      ) : null}
    </Modal>
  );
}

function submitLabel(outcome: FollowUpOutcome | undefined): string {
  if (outcome === 'interested') {
    return '标记待办理报名';
  }
  if (outcome === 'not_interested') {
    return '提交并结束';
  }
  return '提交';
}

function summaryExtra(outcome: FollowUpOutcome | undefined): string | undefined {
  if (outcome === 'interested') {
    return '提交后标记为待办理报名。后续报名办理本期不实现。';
  }
  return undefined;
}

function toCreateInput(values: FollowUpFormValues): CreateFollowUpInput | null {
  if (values.outcome === 'unreachable') {
    const nextFollowupAt = melbourneDateTimeLocalToIso(
      values.nextFollowupAt ?? '',
    );
    if (!nextFollowupAt) {
      return null;
    }
    const summary = values.summary?.trim();
    return {
      outcome: 'unreachable',
      nextFollowupAt,
      ...(summary ? { summary } : {}),
    };
  }
  if (values.outcome === 'considering') {
    const nextFollowupAt = melbourneDateTimeLocalToIso(
      values.nextFollowupAt ?? '',
    );
    const summary = values.summary?.trim();
    if (!nextFollowupAt || !summary) {
      return null;
    }
    return {
      outcome: 'considering',
      summary,
      nextFollowupAt,
    };
  }
  if (values.outcome === 'interested') {
    const summary = values.summary?.trim();
    if (!summary) {
      return null;
    }
    return {
      outcome: 'interested',
      summary,
    };
  }
  if (values.outcome === 'not_interested') {
    const summary = values.summary?.trim();
    const closedReason = values.closedReason?.trim();
    if (!summary || !closedReason) {
      return null;
    }
    return {
      outcome: 'not_interested',
      summary,
      closedReason,
    };
  }
  return null;
}

async function validateFutureMelbourneTime(value: string | undefined) {
  if (!value) {
    return;
  }
  const iso = melbourneDateTimeLocalToIso(value);
  if (!iso) {
    throw new Error('下次跟进时间格式无效');
  }
  if (new Date(iso).getTime() <= Date.now()) {
    throw new Error('下次跟进时间必须是未来时间');
  }
}
