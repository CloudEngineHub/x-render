import { MoreOutlined } from '@ant-design/icons';
import { Handle, Position, useReactFlow } from '@xyflow/react';
import { Dropdown, Menu, message } from 'antd';
import { ItemType } from 'antd/es/menu/interface';
import classNames from 'classnames';
import { isFunction } from 'lodash';
import React, { Fragment, memo, useCallback, useContext, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { useStore } from '../../hooks/useStore';
import { ConfigContext } from '../../models/context';
import {
  capitalize,
  isTruthy,
  transformNodeStatus,
  uuid,
  uuid4,
} from '../../utils';
import './index.less';
import SourceHandle from './sourceHandle';
import { useFlow } from '../../hooks/useFlow';

export default memo((props: any) => {
  const { id, type, data, layout, isConnectable, selected, onClick, status, onDelete } =
    props;
  const {
    widgets,
    settingMap,
    globalConfig,
    onMenuItemClick,
    antdVersion,
    readOnly,
  } = useContext(ConfigContext);
  const deletable = globalConfig?.edge?.deletable ?? true;
  const disabledCopy = settingMap[type]?.disabledCopy ?? false;
  const disabledDelete = settingMap[type]?.disabledDelete ?? false;
  const switchExtra = settingMap[type]?.switchExtra || {};
  const handleProps = globalConfig?.handle || {}
  const renderHandle = settingMap[type]?.renderHandle || void(0)
  // const isConnectableStart = globalConfig?.handle?.isConnectableStart ?? true;
  // const isConnectableEnd = globalConfig?.handle?.isConnectableEnd ?? true;

  const NodeWidget =
    widgets[`${capitalize(type)}Node`] || widgets['CommonNode'];
  const [isHovered, setIsHovered] = useState(false);
  const reactflow = useReactFlow();
  const { edges,nodes,addEdges, mousePosition } =
    useStore(
      (state: any) => ({
        nodes: state.nodes,
        edges: state.edges,
        mousePosition: state.mousePosition,
        addEdges: state.addEdges,
        onEdgesChange: state.onEdgesChange,
      }),
      shallow
    );
  const { addNodes, pasteNode, copyNode, deleteNode } = useFlow();
  const isNote = type === 'Note';
  const isEnd = type === 'End';
  const isSwitchNode = type === 'Switch' || type === 'Parallel' || isNote; // 判断是否为条件节点/并行节点/注释节点
  const connectable = readOnly ? false : isConnectable;
  const nodeSetting = settingMap[type] || {};
  const nodeClassName = nodeSetting?.className || '';
  const disabledShortcutDelete = nodeSetting?.disabledShortcutDelete || false;

  // 判断左侧Handle是否已连接
  const isTargetHandleConnected = useMemo(() => {
    return (edges || [])?.some(edge => edge.target === id);
  }, [edges, id]);

  const isSourceHandleConnected = useMemo(() => {
    if (isSwitchNode) {
      // 对于Switch节点，需要检查每个sourceHandle是否已连接
      if (type === 'Switch' && Array.isArray(data.list)) {
        return data.list.some(item =>
          edges.some(edge => edge.source === id && edge.sourceHandle === item._id)
        );
      }
      // 对于Parallel节点，需要检查每个sourceHandle是否已连接
      if (type === 'Parallel' && Array.isArray(data.list)) {
        return data.list.some(item =>
          edges.some(edge => edge.source === id && edge.sourceHandle === item._id)
        );
      }
      return false;
    }
    // 对于普通节点，检查是否有从该节点出发的边
    return edges.some(edge => edge.source === id);
  }, [edges, id, type, data.list, isSwitchNode]);

  // 增加节点并进行联系
  const handleAddNode = (data: any, sourceHandle?: string) => {
    const { screenToFlowPosition } = reactflow;
    const { x, y } = screenToFlowPosition({
      x: mousePosition.pageX + 100,
      y: mousePosition.pageY + 100,
    });
    const targetId = uuid();
    const title = settingMap[data?._nodeType]?.title || data?._nodeType;
    const newNodes = {
      id: targetId,
      type: 'custom',
      data: {
        title: `${title}_${uuid4()}`,
        ...data,
      },
      position: { x, y },
    };
    const newEdges = {
      id: uuid(),
      source: id,
      target: targetId,
      deletable,
      ...(sourceHandle && { sourceHandle }),
    };
    addNodes(newNodes as any);
    addEdges(newEdges);
  };

  let targetPosition = Position.Left;
  let sourcePosition = Position.Right;
  if (layout === 'TB') {
    targetPosition = Position.Top;
    sourcePosition = Position.Bottom;
  }

  const handleCopyNode = useCallback(() => {
    copyNode(id);
    message.success('复制成功');
  }, [copyNode, id]);

  const handlePasteNode = useCallback(
    (data?: { sourceHandle: string }) => {
      pasteNode(id, data);
    },
    [pasteNode, id]
  );

  const handleDeleteNode = useCallback(() => {
    deleteNode(id);
    onDelete(id)
  }, [deleteNode, id]);

  const defaultAction = (e, sourceHandle) => {
    if (e.key === 'copy') {
      handleCopyNode();
    } else if (e.key === 'paste') {
      handlePasteNode();
    } else if (e.key === 'delete') {
      handleDeleteNode();
    } else if (e.key.startsWith('paste-')) {
      if (sourceHandle) {
        handlePasteNode({
          sourceHandle,
        });
      } else {
        handlePasteNode();
      }
    }
  };

  const itemClick = e => {
    if (!e.key) {
      return;
    }

    const sourceHandle = e.item.props?.sourcehandle;
    if (isFunction(onMenuItemClick)) {
      const data: Record<string, string> = {
        key: e.key,
        nodeId: id,
      };
      if (type === 'Switch' && e.key.startsWith('paste-') && sourceHandle) {
        data['sourceHandle'] = sourceHandle;
      }
      onMenuItemClick(data as any, () => {
        defaultAction(e, sourceHandle);
      });
    } else {
      defaultAction(e, sourceHandle);
    }
  };

  const menuItem: ItemType[] = useMemo(() => {
    if (type === 'Switch') {
      let list = [];
      if (Array.isArray(data.list)) {
        const len = data.list.length;
        list = data.list.map((r, i) => {
          if (i === 0) {
            return {
              label: `粘贴到第${i + 1}个出口`,
              key: 'paste-' + i,
              index: i,
              id: id,
              sourcehandle: r._id,
            };
          } else {
            return {
              label: `粘贴到第${i + 1}个出口`,
              key: 'paste-' + i,
              id: id,
              index: i,
              sourcehandle: r._id,
            };
          }
        });
      }
      const defaultElse = switchExtra?.hideElse
        ? []
        : [
            {
              label: `粘贴到第${list.length + 1}个出口`,
              key: 'paste-' + (list.length + 1),
              id: id,
              index: list.length + 1,
              sourcehandle: 'id_else',
            },
          ];
      return [...list, ...defaultElse];
    }
    return [
      {
        label: '粘贴',
        key: 'paste',
      },
    ];
  }, [type, data, isEnd]);

  // 节点状态处理
  const statusObj = transformNodeStatus(globalConfig?.nodeView?.status || []);
  const nodeBorderColor = statusObj[status]?.color;

  const menu = (
    <Menu onClick={itemClick}>
      <Menu.Item key={'copy'} disabled={disabledCopy}>
        复制
      </Menu.Item>
      {!isEnd ? menuItem.map((r: any) => {
        return (
          <Menu.Item {...r} key={r.key}>
            {r.label}
          </Menu.Item>
        );
      }) : null}
      <Menu.Item key={'delete'} danger={true} disabled={disabledDelete}>
        删除
      </Menu.Item>
    </Menu>
  );

  const dropdownVersionProps = useMemo(() => {
    if (antdVersion === 'V5') {
      return {
        menu: {
          items: [
            {
              label: '复制',
              key: 'copy',
              disabled: disabledCopy,
            },
            ...(isEnd ? [] : menuItem),
            {
              label: '删除',
              key: 'delete',
              danger: true,
              disabled: disabledDelete,
            },
          ],
          onClick: itemClick,
        },
      };
    }
    // V4
    return {
      overlay: menu,
    };
  }, [menuItem, isEnd]);

  const renderHandleMemo = useCallback(()=>{
    if(renderHandle){
      return renderHandle(
        SourceHandle,
        {
          position:sourcePosition,
          isConnectable:connectable,
          selected:selected,
          isHovered:isHovered,
          handleAddNode:handleAddNode
        },
        {
          id,
          type,
          data,
          layout,
          isConnectable,
          readOnly
        }
      )
    }
    return null
  },[renderHandle,SourceHandle,sourcePosition,connectable,selected,isHovered,handleAddNode,id,type,data,layout,isConnectable,readOnly])

  return (
    <div
      className={classNames('xflow-node-container', {
        ['xflow-node-container-selected']: !!selected,
        ['xflow-node-container-tb']: layout === 'TB',
        ['xflow-node-container-note']: isNote,
        [`xflow-node-container-status-${status}`]: isTruthy(status),
        [nodeClassName]: !!nodeClassName
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ '--nodeBorderColor': nodeBorderColor } as React.CSSProperties}
    >
      {!settingMap?.[type]?.targetHandleHidden && !isNote && (
        <Handle
          isValidConnection={(edge)=>{
            if(handleProps.isValidConnection){
              return handleProps.isValidConnection(edge,'target',type)
            }
            return true
          }}
          type="target"
          position={targetPosition}
          isConnectable={connectable}
          className={classNames({
            'handle-connected': isTargetHandleConnected,
            'handle-disconnected': !isTargetHandleConnected,
            "handle-connected-target":true
          })}
          // isConnectableStart={isConnectableStart}
          // isConnectableEnd={isConnectableEnd}
        />
      )}
      {!readOnly && !disabledShortcutDelete && (
        <Dropdown
          disabled={readOnly}
          {...dropdownVersionProps}
          //trigger={['click', 'contextMenu']}
        >
          <div className="xflow-node-actions-container">
            <MoreOutlined
              style={{ transform: 'rotateZ(90deg)', fontSize: '20px' }}
            ></MoreOutlined>
          </div>
        </Dropdown>
      )}
      <NodeWidget
        id={id}
        type={type}
        data={data}
        onClick={() => onClick(data)}
        position={sourcePosition}
        isConnectable={connectable}
        selected={selected}
        isHovered={isHovered}
        handleAddNode={handleAddNode}
      />
      {typeof renderHandle === 'function' ?
        <div onClick={()=>{
          onClick(data)
        }}>
          {renderHandleMemo()}
        </div>
        :
        <Fragment>
          {!settingMap?.[type]?.sourceHandleHidden && !isSwitchNode && (
            <>
              <SourceHandle
                position={sourcePosition}
                isConnectable={connectable}
                selected={selected}
                isHovered={isHovered}
                handleAddNode={handleAddNode}
                isConnected={isSourceHandleConnected}
                nodeType={type}
                // isConnectableStart={isConnectableStart}
                // isConnectableEnd={isConnectableEnd}
              />
            </>
          )}
        </Fragment>
      }
    </div>
  );
});
