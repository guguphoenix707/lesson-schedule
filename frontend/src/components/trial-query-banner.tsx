import { Flex, Input, Select, Typography } from 'antd';
import type { TrialQueryBannerValue, TrialQueryStatusOption } from '../trial/query';
import styles from './trial-query-banner.module.css';

type TrialQueryBannerProps = {
  value: TrialQueryBannerValue;
  statusOptions: TrialQueryStatusOption[];
  onChange: (value: TrialQueryBannerValue) => void;
};

export function TrialQueryBanner({
  value,
  statusOptions,
  onChange,
}: TrialQueryBannerProps) {
  return (
    <Flex className={styles.root} gap="medium" align="center" wrap>
      <label className={styles.field} htmlFor="trial-query-statuses">
        <Typography.Text className={styles.label}>状态</Typography.Text>
        <Select
          allowClear
          className={styles.statusSelect}
          id="trial-query-statuses"
          maxTagCount="responsive"
          mode="multiple"
          options={statusOptions}
          placeholder="全部状态"
          showSearch={{ optionFilterProp: 'label' }}
          value={value.statuses}
          onChange={(statuses: string[] | undefined) => {
            onChange({
              ...value,
              statuses: statuses ?? [],
            });
          }}
        />
      </label>
      <label className={styles.field} htmlFor="trial-query-student-name">
        <Typography.Text className={styles.label}>学生姓名</Typography.Text>
        <Input
          allowClear
          className={styles.nameInput}
          id="trial-query-student-name"
          placeholder="包含匹配"
          value={value.studentName}
          onChange={(event) => {
            const { value: studentName } = event.target;
            onChange({
              ...value,
              studentName,
            });
          }}
        />
      </label>
    </Flex>
  );
}
