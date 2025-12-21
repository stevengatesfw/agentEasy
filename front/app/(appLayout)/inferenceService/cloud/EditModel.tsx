import React from 'react'
import { Form, Input, Modal, Popconfirm, Button, Space } from 'antd'
import { editModel, deleteApiKey } from '@/infrastructure/api/modelWarehouse'
import Toast, { ToastTypeEnum } from '@/app/components/base/flash-notice'
import useRadioAuth from '@/shared/hooks/use-radio-auth'

const ModalList = (props: any) => {
  const { visible, onClose, onSuccess, data, kind } = props
  const [form] = Form.useForm()
  const authRadio = useRadioAuth()
  // 只有 administrator 或 admin 可以配置和删除 API key
  const canConfigure = authRadio.isAdministrator || authRadio.isSuper
  const canDelete = canConfigure
  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      await editModel({ url: '/mh/update_apikey', body: { ...values } })
      Toast.notify({ type: ToastTypeEnum.Success, message: '设置成功' })
      onSuccess()
      form.resetFields()
    }
    catch (error) {
      console.error(error)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteApiKey({ url: '/mh/update_apikey', body: { model_brand: kind } })
      Toast.notify({ type: ToastTypeEnum.Success, message: '删除成功' })
      onSuccess()
      form.resetFields()
      onClose()
    }
    catch (error: any) {
      Toast.notify({ 
        type: ToastTypeEnum.Error, 
        message: error?.message || '删除失败，请稍后重试' 
      })
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onClose()
  }

  const modelName = data?.model_type === 'local' ? data?.model_name : data?.model_brand
  const modelTips = modelName === 'sensenova' ? '请按照以下格式输入：ak:sk' : '请输入API Key'
  const isOpenAI = kind?.toLowerCase() === 'openai'

  // OpenAI 的自定义验证规则：URL 和 API Key 至少填写一个
  const validateUrlOrApiKey = (_: any, _value: any) => {
    const apiKey = form.getFieldValue('api_key')
    const proxyUrl = form.getFieldValue('proxy_url')
    if (!apiKey && !proxyUrl)
      return Promise.reject(new Error('URL 和 API Key 至少需要填写一个'))

    return Promise.resolve()
  }

  // 普通用户无权配置，直接返回 null
  if (!canConfigure) {
    return null
  }

  return (
    <Modal 
      title="设置" 
      destroyOnClose 
      open={visible} 
      onOk={handleOk} 
      onCancel={handleCancel} 
      cancelText='取消' 
      okText='保存'
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          {canDelete && (
            <Popconfirm
              title="删除 API Key 配置"
              description="确定要删除该厂商的 API Key 配置吗？删除后该工作空间内所有用户将无法使用此厂商的模型。"
              onConfirm={handleDelete}
              okText="确定"
              cancelText="取消"
              okButtonProps={{ danger: true }}
            >
              <Button danger>删除 API Key</Button>
            </Popconfirm>
          )}
          <Space>
            <Button onClick={handleCancel}>取消</Button>
            <Button type="primary" onClick={handleOk}>保存</Button>
          </Space>
        </Space>
      }
    >
      <Form
        form={form}
        layout="horizontal"
        autoComplete="off"
        preserve={false}
        labelCol={{ flex: '100px' }}
        wrapperCol={{ flex: 'auto' }}
        labelWrap={true}
      >
        <Form.Item name="model_brand" label="厂商名字" initialValue={kind}>
          <Input disabled value={kind} />
        </Form.Item>
        {isOpenAI && (
          <Form.Item
            name="proxy_url"
            label="URL"
            dependencies={['api_key']}
            rules={[
              // { required: true, message: 'URL 和 API Key 至少需要填写一个' },
              { validator: validateUrlOrApiKey },
            ]}
          >
            <Input placeholder="代理服务地址，或其他兼容openai api接口的云服务商地址" />
          </Form.Item>
        )}
        <Form.Item
          name="api_key"
          label="API Key"
          dependencies={isOpenAI ? ['proxy_url'] : []}
          rules={[
            ...(isOpenAI
              ? [{ validator: validateUrlOrApiKey }]
              : [{ required: true, message: modelTips }]),
          ]}
        >
          <Input placeholder={modelTips} />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default ModalList
