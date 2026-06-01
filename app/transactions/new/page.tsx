"use client";

import Link from "next/link";

import { buttonClassName } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { PermissionNotice } from "@/components/permission-notice";
import { TransactionForm } from "@/components/transaction-form";
import { useBookkeeping } from "@/lib/storage";

export default function AddTransactionPage() {
  const { permissions } = useBookkeeping();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Smart bookkeeping"
        title="新增交易"
        description="输入一句话或按表格字段录入，系统会自动解析交易信息并生成可确认的记账记录。"
        actions={
          <Link className={buttonClassName("secondary")} href="/transactions">
            返回交易列表
          </Link>
        }
      />
      {permissions.canEditTransactions ? (
        <TransactionForm />
      ) : (
        <PermissionNotice detailKey="permissionRequiredOwnerAdmin" />
      )}
    </div>
  );
}
